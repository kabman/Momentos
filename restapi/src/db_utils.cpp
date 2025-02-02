#include "db_utils.h"
#include <crow/logging.h>
#include <pqxx/pqxx>
#include <cstddef>

namespace mkm
{
    std::variant<User, ErrorCode> get_user_details(const std::string &username)
    {
        pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos hostaddr=127.0.0.1 port=5432");

        pqxx::read_transaction transaction(c);

        try
        {
            auto row = transaction.exec1("SELECT * FROM users WHERE username=" + transaction.quote(username));
            transaction.commit();
            return User{
                .username = row["username"].c_str(),
                .password_hash = row["password_hash"].c_str(),
                .full_name = row["fullname"].c_str(),
                .birth_date = row["birthdate"].c_str(),
                .email_id = row["emailid"].c_str(),
                .account_creation_date = row["account_creation_time"].c_str()
            };
        }
        catch (const pqxx::unexpected_rows &e)
        {
            CROW_LOG_ERROR << "Number of rows returned is not equal to 1: " << e.what();
            return ErrorCode::INTERNAL_ERROR;
        }
    }

    bool is_password_valid(const std::string &input_password, const std::string &stored_password_hash)
    {
        // TODO: replace hardcoded string with values from some environment/properties file
        pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos hostaddr=127.0.0.1 port=5432");

        pqxx::read_transaction transaction(c);

        try
        {
            // References:
            // [1] https://stackoverflow.com/a/18687445
            // [2] https://www.postgresql.org/docs/current/pgcrypto.html

            std::stringstream s;
            s << "SELECT (CASE WHEN crypt(" << transaction.quote(input_password) << ',' << transaction.quote(stored_password_hash)
              << ") = " << transaction.quote(stored_password_hash) << " THEN true ELSE false END) as is_equal";
            const std::string query = s.str();
            CROW_LOG_DEBUG << "Query: " << query;
            bool is_password_match = transaction.query_value<bool>(query);
            transaction.commit();
            return is_password_match;
        }
        catch (const pqxx::unexpected_rows &e)
        {
            CROW_LOG_ERROR << "Number of rows returned is not equal to 1: " << e.what();
            return false;
        }
        catch (const pqxx::usage_error &e)
        {
            CROW_LOG_ERROR << "Number of columns returned is not equal to 1: " << e.what();
            return false;
        }
        catch(const pqxx::sql_error& e)
        {
            CROW_LOG_ERROR << "Internal exception was thrown: " << e.what();
            return false;
        }
    }

    bool create_new_account(const User& user_details, const std::string& password)
    {
        // TODO: replace hardcoded string with values from some environment/properties file
        pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos");

        pqxx::work transaction(c);

        try
        {
            std::stringstream s;
            s << "INSERT INTO users(username, fullname, birthdate, emailid, password_hash, account_creation_time) "
                "VALUES("
                << transaction.quote(user_details.username) <<  ','
                << transaction.quote(user_details.full_name) << ','
                << transaction.quote(user_details.birth_date) << ','
                << transaction.quote(user_details.email_id) << ", crypt("
                << transaction.quote(password) << ", gen_salt('bf', 8)), now())";
            const std::string query = s.str();
            CROW_LOG_DEBUG << "Query: " << query;
            auto result = transaction.exec(query);
            if (result.affected_rows() != 1)
            {
                CROW_LOG_ERROR << "Something went wrong - couldn't insert data into database table";
                return false;
            }
            transaction.commit();
            return true;
        }
        catch(const pqxx::sql_error& e)
        {
            CROW_LOG_ERROR << "Internal exception was thrown: " << e.what();
            return false;
        }
    }

    bool add_new_moment(const Moment& moment)
    {
        // TODO: replace hardcoded string with values from some environment/properties file
        pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos");

        pqxx::work transaction(c);

        try
        {
            std::basic_string_view<std::byte> image_content_bytes{
                std::data(moment.image_content),
                std::size(moment.image_content)
            };
            std::string image_content;
            std::string image_filename;
            std::string image_caption;

            // In case of no data, set the image_data to NULL
            image_content = image_content_bytes.empty() ? "NULL" : 
                transaction.quote_raw(
                    reinterpret_cast<const unsigned char*>(image_content_bytes.data()),
                    image_content_bytes.size()
                );
            image_filename = image_content_bytes.empty() ? "NULL" : transaction.quote(moment.image_filename);
            image_caption = image_content_bytes.empty() ? "NULL" : transaction.quote(moment.image_caption);

            // Will use a SQL trigger / function which will get triggered before insert
            // new_id = select count(*) + 1 from moments where username=<username>
            // https://stackoverflow.com/q/61917751
            std::stringstream s;
            s << "INSERT INTO moments(username, title, description, moment_date, image_filename, image_data, image_caption, feelings) "
                "VALUES("
                << transaction.quote(moment.username) <<  ','
                << transaction.quote(moment.title) << ','
                << transaction.quote(moment.description) << ','
                << transaction.quote(moment.date) << ','
                << image_filename << ','
                << image_content << ','
                << image_caption << ',';
            if (moment.feelings.empty())
            {
                s << "NULL";
            }
            else
            {
                s << "'{";
                for (size_t i = 0; i < moment.feelings.size(); i++)
                {
                    s << '"' << transaction.esc(moment.feelings[i]) << '"';
                    if (i != moment.feelings.size() - 1)
                    {
                        s << ',';
                    }
                }
                s << "}'";
            }
            s << ')';

            auto result = transaction.exec(s.str());
            if (result.affected_rows() != 1)
            {
                CROW_LOG_ERROR << "Something went wrong - couldn't insert data into database table";
                return false;
            }
            transaction.commit();
            return true;
        }
        catch(const pqxx::sql_error& e)
        {
            CROW_LOG_ERROR << "Internal exception was thrown: " << e.what();
            return false;
        }
    }

    bool update_moment(const Moment& moment)
    {
        // TODO: replace hardcoded string with values from some environment/properties file
         pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos");

        pqxx::work transaction(c);

        try
        {
            std::basic_string_view<std::byte> image_content_bytes{
                std::data(moment.image_content),
                std::size(moment.image_content)
            };

            std::stringstream s;
            s << "UPDATE moments SET ";
            if (!moment.title.empty())
            {
                s << "title=" << transaction.quote(moment.title) << ',';
            }
            if (!moment.description.empty())
            {
                s << "description=" << transaction.quote(moment.description) << ',';
            }
            if (!moment.date.empty())
            {
                s << "moment_date=" << transaction.quote(moment.date) << ',';
            }
            if (!moment.feelings.empty())
            {
                s << "feelings='{";
                for (size_t i = 0; i < moment.feelings.size(); i++)
                {
                    s << '"' << transaction.esc(moment.feelings[i]) << '"';
                    if (i != moment.feelings.size() - 1)
                    {
                        s << ',';
                    }
                }
                s << "}',";
            }
            if (!image_content_bytes.empty())
            {
                s << "image_data=" << 
                    transaction.quote_raw(
                        reinterpret_cast<const unsigned char*>(image_content_bytes.data()),
                        image_content_bytes.size()
                    ) << ",image_filename=" << transaction.quote(moment.image_filename) << ',';
            }
            if (!moment.image_caption.empty())
            {
                s << "image_caption=" << transaction.quote(moment.image_caption) << ',';
            }
            s << "last_modified_date=NOW() WHERE username=" << transaction.quote(moment.username) << " AND id=" << moment.id;

            auto result = transaction.exec(s.str());
            if (result.affected_rows() != 1)
            {
                CROW_LOG_ERROR << "Something went wrong - couldn't update data into database table";
                return false;
            }
            transaction.commit();
            return true;
        }
        catch(const pqxx::sql_error& e)
        {
            CROW_LOG_ERROR << "Internal exception was thrown: " << e.what();
            return false;
        }
    }

    bool delete_moment(const std::string& username, uint64_t moment_id)
    {
        // TODO: replace hardcoded string with values from some environment/properties file
        pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos");

        pqxx::work transaction(c);

        try
        {
            std::stringstream s;
            s << "DELETE FROM moments WHERE username=" << transaction.quote(username) << " AND id=" << moment_id;

            auto result = transaction.exec(s.str());
            if (result.affected_rows() != 1)
            {
                CROW_LOG_ERROR << "Something went wrong - couldn't delete moment from database table";
                return false;
            }
            transaction.commit();
            return true;
        }
        catch(const pqxx::sql_error& e)
        {
            CROW_LOG_ERROR << "Internal exception was thrown: " << e.what();
            return false;
        }
    }

    uint64_t get_moment_count(const std::string& username)
    {
        // TODO: replace hardcoded string with values from some environment/properties file
         pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos");

        pqxx::read_transaction transaction(c);

        try
        {
            auto row = transaction.exec1("SELECT COUNT(*) as total_moments FROM moments WHERE username=" + transaction.quote(username));
            transaction.commit();
            return row["total_moments"].as<uint64_t>();
        }
        catch (const pqxx::unexpected_rows &e)
        {
            CROW_LOG_ERROR << "Number of rows returned is not equal to 1: " << e.what();
            return 0;
        }
    }

    std::variant< std::vector<Moment>, ErrorCode > get_moments_list(const std::string& username, uint32_t page_size, uint64_t current_page, std::optional<std::string> sort_by, std::optional<std::string> search)
    {
        // TODO: replace hardcoded string with values from some environment/properties file
        pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos");

        pqxx::read_transaction transaction(c);
        try
        {
            std::stringstream s;
            s << "SELECT * FROM moments WHERE username=" << transaction.quote(username);
            if (search.has_value())
            {
                s << " AND title like '%" << transaction.esc(search.value()) << "%'";
            }
            std::string sort_by_val = "asc";
            if (sort_by.has_value() && sort_by.value() == "date-desc")
            {
                sort_by_val = "desc";
            }
            s << " ORDER BY created_date " << sort_by_val;
            s << " OFFSET " << (current_page - 1) * page_size;
            s << " LIMIT " << page_size;

            std::string query = s.str();
            CROW_LOG_DEBUG << "Query: " << query;

            auto result = transaction.exec(query);
            transaction.commit();

            std::vector<Moment> moments;
            for (size_t i = 0; i < result.size(); i++)
            {
                auto row = result[i];

                Moment moment{
                    .id = row["id"].as<uint64_t>(),
                    .username = row["username"].c_str(),
                    .title = row["title"].c_str(),
                    .description = row["description"].c_str(),
                    .date = row["moment_date"].c_str(),
                    .created_date = row["created_date"].c_str(),
                    .last_modified_date = row["last_modified_date"].c_str()
                };

                if (!row["image_data"].is_null())
                {
                    std::basic_string<std::byte> byte_image_content = transaction.unesc_bin(row["image_data"].c_str());
                    moment.image_content = std::vector<std::byte>(byte_image_content.begin(), byte_image_content.end());
                    moment.image_filename = row["image_filename"].c_str();
                }

                moments.push_back(std::move(moment));
            }
            return moments;
        }
        catch(const pqxx::sql_error& e)
        {
            CROW_LOG_ERROR << "Internal exception was thrown: " << e.what();
            return ErrorCode::INTERNAL_ERROR;
        }
        
    }

    std::variant<Moment, ErrorCode> get_moment_details(const std::string& username, uint64_t id)
    {
        pqxx::connection c("dbname=mkm_db user=mkm_user password=momentos");

        pqxx::read_transaction transaction(c);

        try
        {
            std::stringstream s;
            s << "SELECT * FROM moments WHERE username=" << transaction.quote(username) << " AND id=" << id;
            std::string query = s.str();
            CROW_LOG_DEBUG << "Query: " << query;

            auto row = transaction.exec1(query);
            transaction.commit();

            Moment moment{
                .id = row["id"].as<uint64_t>(),
                .username = row["username"].c_str(),
                .title = row["title"].c_str(),
                .description = row["description"].c_str(),
                .date = row["moment_date"].c_str(),
                .image_caption = row["image_caption"].c_str(),
                .created_date = row["created_date"].c_str(),
                .last_modified_date = row["last_modified_date"].c_str()
            };

            if (!row["image_data"].is_null())
            {
                std::basic_string<std::byte> byte_image_content = transaction.unesc_bin(row["image_data"].c_str());
                moment.image_content = std::vector<std::byte>(byte_image_content.begin(), byte_image_content.end());
                moment.image_filename = row["image_filename"].c_str();
            }
            if (!row["feelings"].is_null())
            {
                auto array_parser_obj = row["feelings"].as_array();
                while (true)
                {
                    const auto& [juncture_val, array_val] = array_parser_obj.get_next();
                    if (juncture_val == pqxx::array_parser::juncture::done)
                    {
                        break;
                    }
                    if (juncture_val == pqxx::array_parser::juncture::string_value)
                    {
                        moment.feelings.push_back(array_val);
                    }
                }
            }
            return moment;
        }
        catch (const pqxx::unexpected_rows &e)
        {
            CROW_LOG_ERROR << "Number of rows returned is not equal to 1: " << e.what();
            return ErrorCode::INTERNAL_ERROR;
        }
    }
} 