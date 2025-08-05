-- 数据库初始化脚本
-- 按正确顺序执行表创建

-- 设置时区
SET timezone = 'UTC';

-- 创建扩展（如果需要）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 开始事务
BEGIN;

-- 1. 首先创建用户表
\i /docker-entrypoint-initdb.d/sql_files/users.sql

-- 2. 然后创建文档表
\i /docker-entrypoint-initdb.d/sql_files/documents.sql

-- 3. 最后创建文档版本表
\i /docker-entrypoint-initdb.d/sql_files/documents_versions.sql

-- 提交事务
COMMIT;

-- 显示初始化完成信息
SELECT 'Database initialization completed successfully' as status; 