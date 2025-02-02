# Momentos
Store all your precious moments in one app.

# Tech stack
* Front-end: Next.js
* Back-end: C++ 
* Database: PostgreSQL

# Dependencies
## Front end
* Next js
## Back end
* [Crow](https://github.com/CrowCpp/Crow/) - C++ framework for web app/service
* OpenSSL - for HTTPS
* ZLib - for compression
* Standalone ASIO - required by Crow
* libpq - C library for accessing Postgres databases
* [libpqxx](https://github.com/jtv/libpqxx) - C++ wrapper library for libpq (Postgres)
* [jwt-cpp](https://github.com/Thalhammer/jwt-cpp) - for JSON Web Tokens

# Cloning repo
```
git clone --recurse-submodules https://github.com/kabman/Momentos
git submodule update --init --depth 3 --recursive --remote --jobs 4
```

# Installating some pre-requisites
```
sudo apt-get update

sudo apt-get install libpq-dev libssl-dev zlib1g-dev

# For installing postgresql server
sudo apt-get install postgresql postgresql-contrib
```

# Database schema
Database schema is present [here](restapi/mkm_db.sql).

# Building and running REST API
```
cd restapi
mkdir build && cd build
cmake ..
make
./Momentos
```

# Running front end
```
npm install
npm run dev
```


