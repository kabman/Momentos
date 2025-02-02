cmake_minimum_required(VERSION 3.15)
project(Momentos LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)  # Changed to 17
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Dependency Management
find_package(OpenSSL REQUIRED)
find_package(ZLIB REQUIRED)
find_package(PostgreSQL REQUIRED)  # Added

# Use FetchContent for dependencies
include(FetchContent)

# Crow
FetchContent_Declare(crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow
    GIT_TAG v1.0+5
)
set(CROW_FEATURES ssl compression)
FetchContent_MakeAvailable(crow)

# libpqxx (updated to 7.8.1)
FetchContent_Declare(libpqxx
    GIT_REPOSITORY https://github.com/jtv/libpqxx
    GIT_TAG 7.8.1  # Updated version
)
FetchContent_MakeAvailable(libpqxx)

# jwt-cpp
FetchContent_Declare(jwt-cpp
    GIT_REPOSITORY https://github.com/Thalhammer/jwt-cpp
    GIT_TAG v0.7.0
)
FetchContent_MakeAvailable(jwt-cpp)

# Executable
add_executable(Momentos
    src/Error.cpp 
    src/db_utils.cpp 
    src/main.cpp
)

target_link_libraries(Momentos PRIVATE
    Crow::Crow
    pqxx
    PostgreSQL::PostgreSQL  # Added
    jwt-cpp::jwt-cpp
    OpenSSL::SSL
    OpenSSL::Crypto
    ZLIB::ZLIB
)