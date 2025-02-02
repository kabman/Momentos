#include "db_utils.h"
#include <iostream>
#include <iomanip>
#include <string>
#include <tuple>
#include <regex>
#include <optional>
#include <cstddef>
#include <variant>
#include <vector>
#include <sstream>
#include <chrono>
#include <limits>
#include "crow.h"
#include "crow/middlewares/cors.h"
#include <pqxx/pqxx>
#include <jwt-cpp/jwt.h>
#include "Moment.h"
#include "User.h"

// Constants
constexpr size_t MAX_REQUEST_SIZE = 10 * 1024 * 1024;  // 10MB
constexpr size_t MAX_FIELD_LENGTH = 1024;              // 1KB
constexpr const char* JWT_SECRET = "secret";           // Should be loaded from config
constexpr int JWT_EXPIRY_SECONDS = 3600;              // 1 hour

struct RequestLogger {
    struct context {};

    void before_handle(crow::request& req, crow::response&, context&) {
        CROW_LOG_DEBUG << "Before request handle: " << req.url 
                      << " [Method: " << method_name(req.method) << "]";
    }

    void after_handle(crow::request& req, crow::response& res, context&) {
        CROW_LOG_DEBUG << "After request handle: " << req.url 
                      << " [Status: " << res.code << "]";
    }

private:
    static std::string method_name(crow::HTTPMethod method) {
        switch (method) {
            case crow::HTTPMethod::GET: return "GET";
            case crow::HTTPMethod::POST: return "POST";
            case crow::HTTPMethod::PUT: return "PUT";
            case crow::HTTPMethod::DELETE: return "DELETE";
            default: return "UNKNOWN";
        }
    }
};

/**
 * @brief Validates string length and content
 * @param str String to validate
 * @param max_length Maximum allowed length
 * @param field_name Field name for error messages
 * @return std::optional<std::string> Error message if invalid, empty if valid
 */
static std::optional<std::string> validate_string(const std::string& str, 
                                                size_t max_length,
                                                const std::string& field_name) {
    if (str.empty()) {
        return field_name + " cannot be empty";
    }
    if (str.length() > max_length) {
        return field_name + " exceeds maximum length of " + std::to_string(max_length);
    }
    if (str.find_first_of("\0\n\r") != std::string::npos) {
        return field_name + " contains invalid characters";
    }
    return std::nullopt;
}

/**
 * @brief Verify the authorization header and extract username
 */
static bool verify_authorization_header(const crow::request& req, std::string& username) {
    const auto& headers_it = req.headers.find("Authorization");
    if (headers_it == req.headers.end()) {
        CROW_LOG_ERROR << "Missing Authorization header";
        return false;
    }

    const std::string& authorization_value = headers_it->second;
    std::regex bearer_scheme_regex("Bearer +([A-Za-z0-9_\\-.~+]+[=]*)");
    std::smatch m;
    if (!std::regex_match(authorization_value, m, bearer_scheme_regex)) {
        CROW_LOG_ERROR << "Invalid Authorization header format";
        return false;
    }

    try {
        auto decoded_token = jwt::decode(m[1].str());
        auto verifier = jwt::verify()
                           .allow_algorithm(jwt::algorithm::hs512{JWT_SECRET})
                           .with_issuer("MKM");
        verifier.verify(decoded_token);
        
        username = decoded_token.get_payload_claim("username").as_string();
        if (username.empty()) {
            CROW_LOG_ERROR << "Empty username in token";
            return false;
        }
        return true;
    }
    catch(const std::exception& e) {
        CROW_LOG_ERROR << "Token verification error: " << e.what();
        return false;
    }
}

/**
 * @brief Get string value from multipart message
 */
static bool get_part_value_string_if_present(
    const crow::multipart::message& multi_part_message,
    const char* part_name,
    std::string& part_value) {
    
    auto it = multi_part_message.part_map.find(part_name);
    if (it == multi_part_message.part_map.end() || it->second.body.empty()) {
        return false;
    }
    
    if (it->second.body.length() > MAX_FIELD_LENGTH) {
        throw std::runtime_error(std::string(part_name) + " exceeds maximum length");
    }
    
    part_value = it->second.body;
    return true;
}

/**
 * @brief Extract file from multipart message
 */
static bool create_file_from_part_value_if_present(
    const crow::multipart::message& multi_part_message,
    const char* part_name,
    std::string& file_name,
    std::vector<std::byte>& file_contents) {
    
    auto it = multi_part_message.part_map.find(part_name);
    if (it == multi_part_message.part_map.end() || it->second.body.empty()) {
        return false;
    }

    auto headers_it = it->second.headers.find("Content-Disposition");
    if (headers_it == it->second.headers.end()) {
        throw std::runtime_error("No Content-Disposition found");
    }

    auto params_it = headers_it->second.params.find("filename");
    if (params_it == headers_it->second.params.end()) {
        throw std::runtime_error(std::string("Part '") + part_name + "' missing filename");
    }

    file_name = params_it->second;
    if (file_name.length() > MAX_FIELD_LENGTH) {
        throw std::runtime_error("Filename too long");
    }

    if (it->second.body.length() > MAX_REQUEST_SIZE) {
        throw std::runtime_error("File size too large");
    }

    file_contents.clear();
    std::transform(it->second.body.begin(),
                  it->second.body.end(),
                  std::back_inserter(file_contents),
                  [](char c) { return std::byte(c); });
    return true;
}

int main() {
    try {
        crow::App<crow::CORSHandler, RequestLogger> app;
        
        CROW_LOG_INFO << "Starting server on port 5000...";

        // Configure CORS
        auto& cors = app.get_middleware<crow::CORSHandler>();
        cors
          .global()
          .headers("*")
          .methods("POST"_method, "GET"_method, "PUT"_method, "DELETE"_method)
          .prefix("/")
          .origin("*");

        // Root route
        CROW_ROUTE(app, "/")
        .methods(crow::HTTPMethod::GET)
        ([](const crow::request&) {
            return crow::response("Momentos API Server v1.0");
        });

        // CORS OPTIONS handler
        CROW_ROUTE(app, "/<path>")
        .methods(crow::HTTPMethod::OPTIONS)
        ([](const crow::request&, std::string) {
            auto response = crow::response(crow::status::OK);
            response.add_header("Access-Control-Allow-Origin", "*");
            response.add_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
            response.add_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            return response;
        });

        // Create Account Route
        CROW_ROUTE(app, "/create-account")
        .methods(crow::HTTPMethod::POST)
        ([](const crow::request& req) {
            try {
                // Validate Content-Type
                const auto& content_type = req.get_header_value("Content-Type");
                if (content_type.find("multipart/form-data") != 0) {
                    return crow::response(crow::status::BAD_REQUEST, "Invalid Content-Type");
                }

                // Validate Content-Length
                const auto& content_length_str = req.get_header_value("Content-Length");
                if (content_length_str.empty()) {
                    return crow::response(crow::status::BAD_REQUEST, "Missing Content-Length");
                }
                
                try {
                    size_t content_length = std::stoull(content_length_str);
                    if (content_length > MAX_REQUEST_SIZE) {
                        return crow::response(crow::status::BAD_REQUEST, "Request too large");
                    }
                } catch (const std::exception& e) {
                    return crow::response(crow::status::BAD_REQUEST, "Invalid Content-Length");
                }

                CROW_LOG_DEBUG << "Parsing multipart message...";
                crow::multipart::message multi_part_message(req);
                
                CROW_LOG_DEBUG << "Creating user details object...";
                mkm::User user_details;
                std::string password;
                
                // Validate and extract required fields
                if (!get_part_value_string_if_present(multi_part_message, "fullname", user_details.full_name)) {
                    return crow::response(crow::status::BAD_REQUEST, "Missing fullname");
                }
                
                if (!get_part_value_string_if_present(multi_part_message, "birthdate", user_details.birth_date)) {
                    return crow::response(crow::status::BAD_REQUEST, "Missing birthdate");
                }
                
                if (!get_part_value_string_if_present(multi_part_message, "emailid", user_details.email_id)) {
                    return crow::response(crow::status::BAD_REQUEST, "Missing emailid");
                }
                
                if (!get_part_value_string_if_present(multi_part_message, "username", user_details.username)) {
                    return crow::response(crow::status::BAD_REQUEST, "Missing username");
                }
                
                if (!get_part_value_string_if_present(multi_part_message, "password", password)) {
                    return crow::response(crow::status::BAD_REQUEST, "Missing password");
                }

                // Validate field contents
                for (const auto& [field, value] : {
                    std::make_pair("fullname", user_details.full_name),
                    std::make_pair("username", user_details.username),
                    std::make_pair("emailid", user_details.email_id),
                    std::make_pair("password", password)
                }) {
                    if (auto error = validate_string(value, MAX_FIELD_LENGTH, field)) {
                        return crow::response(crow::status::BAD_REQUEST, *error);
                    }
                }

                CROW_LOG_DEBUG << "Creating new account...";
                if (!mkm::create_new_account(user_details, password)) {
                    return crow::response(crow::status::INTERNAL_SERVER_ERROR, 
                        mkm::error_str(mkm::ErrorCode::INTERNAL_ERROR));
                }

                CROW_LOG_INFO << "Account created successfully for user: " << user_details.username;
                return crow::response(crow::status::OK);
                
            } catch (const std::exception& e) {
                CROW_LOG_ERROR << "Exception in create-account: " << e.what();
                return crow::response(crow::status::INTERNAL_SERVER_ERROR, "Server error");
            }
        });

        // Login Route
        CROW_ROUTE(app, "/login")
        .methods(crow::HTTPMethod::POST)
        ([](const crow::request& req) {
            try {
                auto x = crow::json::load(req.body);
                if (!x || !x.has("username") || !x.has("password")) {
                    return crow::response(crow::status::BAD_REQUEST, "Invalid request format");
                }

                std::string username = x["username"].s();
                std::string password = x["password"].s();

                // Validate inputs
                if (auto error = validate_string(username, MAX_FIELD_LENGTH, "username")) {
                    return crow::response(crow::status::BAD_REQUEST, *error);
                }
                if (auto error = validate_string(password, MAX_FIELD_LENGTH, "password")) {
                    return crow::response(crow::status::BAD_REQUEST, *error);
                }

                auto result = mkm::get_user_details(username);
                if (std::holds_alternative<mkm::ErrorCode>(result)) {
                    return crow::response(crow::status::UNAUTHORIZED, 
                        mkm::error_str(std::get<mkm::ErrorCode>(result)));
                }

                const auto& user = std::get<mkm::User>(result);
                if (!mkm::is_password_valid(password, user.password_hash)) {
                    return crow::response(crow::status::UNAUTHORIZED, 
                        mkm::error_str(mkm::ErrorCode::AUTHENTICATION_ERROR));
                }

                auto current_time = std::chrono::system_clock::now();
                auto token = jwt::create()
                            .set_issuer("MKM")
                            .set_type("JWS")
                            .set_issued_at(current_time)
                            .set_expires_at(current_time + std::chrono::seconds{JWT_EXPIRY_SECONDS})
                            .set_payload_claim("username", jwt::claim(user.username))
                            .sign(jwt::algorithm::hs512{JWT_SECRET});

                crow::json::wvalue resp{
                    {"access_token", token},
                    {"username", user.username},
                    {"expires_in", JWT_EXPIRY_SECONDS}
                };
                return crow::response(crow::status::OK, resp);

            } catch (const std::exception& e) {
                CROW_LOG_ERROR << "Exception in login: " << e.what();
                return crow::response(crow::status::INTERNAL_SERVER_ERROR, "Server error");
            }
        });

        // Get Total Moments Route
        CROW_ROUTE(app, "/moments/total")
        .methods(crow::HTTPMethod::GET)
        ([](const crow::request& req) {
            try {
                std::string username;
                if (!verify_authorization_header(req, username)) {
                    return crow::response(crow::status::UNAUTHORIZED, 
                        mkm::error_str(mkm::ErrorCode::AUTHENTICATION_ERROR));
                }

                crow::json::wvalue resp_json{{"total_moments", mkm::get_moment_count(username)}};
                return crow::response(crow::status::OK, resp_json);

            } catch (const std::exception& e) {
                CROW_LOG_ERROR << "Exception in moments/total: " << e.what();
                return crow::response(crow::status::INTERNAL_SERVER_ERROR, "Server error");
            }
        });

        // Start the server
        app.loglevel(crow::LogLevel::DEBUG);
        app.port(5000).run();

    } catch (const std::exception& e) {
        CROW_LOG_ERROR << "Fatal error: " << e.what();
        return 1;
    }
    return 0;
}