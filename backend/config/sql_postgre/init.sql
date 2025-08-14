
SET timezone = 'UTC';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

\i /docker-entrypoint-initdb.d/sql_files/users.sql

\i /docker-entrypoint-initdb.d/sql_files/documents.sql

\i /docker-entrypoint-initdb.d/sql_files/documents_versions.sql

\i /docker-entrypoint-initdb.d/sql_files/api_logs.sql

\i /docker-entrypoint-initdb.d/sql_files/personal_statement_profile.sql

SELECT 'Database initialization completed successfully' as status; 