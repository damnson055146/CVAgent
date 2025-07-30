平台后端文档


前端接口部分

一、公共说明

Base URL：http://<HOST>:<PORT>(后端接口为8700)

Content-Type：所有请求均为 application/json（除上传 PDF 接口为 multipart/form-data）。

鉴权方式：除用户注册、登录、健康检查外，其余接口均依赖 auth_validator，前端需在请求头中携带：

后端测试用x-api-key 为 9589ca16aa2844de6975809fbac3891ef2a105eadcde6f56e044c60b6b774ec4

二、Health Check

GET /
Tags：Health Check
描述：检查服务是否启动。

请求示例

GET / HTTP/1.1
Host: localhost:8698

响应

{
  "status": "ok",
  "message": "API服务已成功启动！"
}

三、用户管理

3.1 用户注册

POST /api/users
Tags：Users
描述：注册新用户。

请求头

Content-Type: application/json

请求体 main

{
  "email": "user@example.com",
  "password_hash": "abcdef...（40+字符）",
  "role": "guest",          // 可选: guest|vvip|consultant|etc..
  "status": 1,              // 0~2
  "metadata": { }           // 可选
}

响应（201 Created）

{
  "id": "<UUID>",
  "email": "user@example.com",
  "role": "guest",
  "status": 1,
  "failed_login_attempts": 0,
  "locked_until": null,
  "last_login_at": null,
  "created_at": "2025-07-27T22:xx:xxZ",
  "updated_at": "2025-07-27T22:xx:xxZ",
  "deleted_at": null,
  "metadata": {}
}

错误

400：邮箱已注册。

3.2 用户登录

POST /api/users/login
Tags：Users

描述：用户登录，返回访问 token。

请求头

Content-Type: application/json

请求体 main

{
  "email": "user@example.com",
  "password_hash": "abcdef...（40+字符）"
}

响应（200 OK）

{
  "access_token": "<UUID>",   // 用作后续 api_key
  "token_type": "bearer"
}

错误

401：邮箱或密码错误。

四、文档版本管理

4.1 上传或保存新版本
POST /api/documents_save/{doc_type}
Tags：Documents
描述：根据类型上传（或更新）用户文档，自动创建新版本。

路径参数

doc_type: resume | personal_statement | recommendation

请求头

Content-Type: application/json
api_key: <access_token from login>

请求体 main

{
  "user_id": "<用户 UUID>",
  "content_md": "# Markdown 内容"
}

响应（200 OK）

{
  "id": "<文档 UUID>",
  "user_id": "<用户 UUID>",
  "type": "resume",
  "current_version_id": "<版本 UUID>",
  "content_md": "# 当前 Markdown 内容",
  "created_at": "2025-07-27T22:xx:xxZ",
  "updated_at": "2025-07-27T22:xx:xxZ"
}

错误

400：doc_type 非法

401：未提供或非法 api_key

500：外键约束，user_id 不存在 main

4.2 获取当前版本内容

POST /api/documents/{doc_type}
Tags：Documents
描述：获取指定类型文档的当前版本内容。

路径参数

doc_type: resume | personal_statement | recommendation

请求头

Content-Type: application/json
api_key: <access_token>

请求体 main

{
  "user_id": "<用户 UUID>"
}

响应（200 OK）

{
  "id": "<文档 UUID>",
  "user_id": "<用户 UUID>",
  "type": "recommendation",
  "current_version_id": "<版本 UUID>",
  "content_md": "# 版本 Markdown 内容",
  "created_at": "2025-07-27T22:xx:xxZ",
  "updated_at": "2025-07-27T22:xx:xxZ"
}

错误

404：未找到该类型文档或无版本 main

五、文本与简历处理（Routes 下）

所有以下端点均 必须 在请求头提供 api_key，Content-Type: application/json（除上传文件）。

源文件：

5.1 解析上传的简历 PDF
POST /parse-resume/
描述：上传 PDF，提取文本并调用 Dify 解析。

请求头

api_key: <access_token>
Content-Type: multipart/form-data

请求体

file: PDF 文件

响应（200 OK）(举例)

{
    "user_uid": "full-example-user-002",
    "user_name": "李欣然",
    "user_contact_info": {
        "phone": "185-7764-3281",
        "email": "xinran.li20@stu.ecnu.edu.cn"
    },
    "user_education": [
        {
            "user_university": "华东师范大学",
            "user_major": "统计学",
            "degree": "理学学士",
            "dates": "2018/09 - 2022/06",
            "details": "核心课程：高等数学、概率论与数理统计、时间序列分析、机器学习导论、R语言编程、社会调查方法。",
            "user_grade": "",
            "user_graduate_year": "2022",
            "user_gpa": "",
            "user_language_score": ""
        }
    ],
    "internship_experience": [
        {
            "company": "腾讯",
            "role": "产品数据实习生",
            "location": "",
            "dates": "2021/12 - 2022/03",
            "description_points": [
                "负责用户行为数据的分析和产品功能优化建议。",
                "使用 SQL 和 Python 构建了用户活跃度与留存率的自动化监控报表。"
            ]
        },
        {
            "company": "中信建投证券",
            "role": "行业研究实习生",
            "location": "",
            "dates": "2021/07 - 2021/09",
            "description_points": [
                "协助撰写新能源行业研究报告。",
                "参与调研会议并整理战略信息。"
            ]
        },
        {
            "company": "艾瑞咨询",
            "role": "调研分析实习生",
            "location": "",
            "dates": "2020/11 - 2021/02",
            "description_points": [
                "主要负责消费电子市场调研项目的数据清洗、问卷设计及初步报告撰写。",
                "参与客户汇报材料准备。"
            ]
        }
    ],
    "user_research_experience": [],
    "user_extracurricular_activities": [
        {
            "organization": "数据科学协会",
            "role": "运营部部长",
            "location": "校内",
            "dates": "2019/03 - 2020/12",
            "description_points": [
                "组织社团活动、提升成员参与度。",
                "策划微信公众号内容，定期发布数据分析相关的推文，增强社团影响力。"
            ]
        }
    ],
    "user_target": ""
}

错误

400：非 PDF 文件

500：提取或 Dify 调用失败 routes

5.2 解析纯文本简历
POST /parse-resume-text/
描述：直接提交纯文本，调用 Dify 解析。

请求体 满足 TextInput：

{
  "text": "简历文本内容..."
}

响应（200 OK）

同5.1

5.3 文本优化、扩写、缩写
POST /optimize-text/
POST /expand-text/
POST /contract-text/

请求体

{ "text": "原始文本..." }

响应（200 OK）

optimize:

{ "rewritten_text": "优化后文本..." }

expand:

{ "expanded_text": "扩写后文本..." }

contract:

{ "contracted_text": "缩写后文本..." }

5.5 简历评估
POST /evaluate-resume/
描述：将传入 JSON 转为字符串，再交给 Dify 处理。

请求体
任意简历的 JSON 对象

响应（200 OK）

{ "processed_text": "处理后文本..." }

5.6 自定义提示修改文本
POST /modified-text-prompt/
描述：按自定义 Prompt 生成文本。

请求体 满足 PromptTextInput：

{
  "text": "原文",
  "prompt": "请将以下内容改写为正式邮件。"
}

响应（200 OK）

{ "modified_text": "生成后的文本..." }

5.7 生成个人陈述 & 推荐信
POST /generate_statement/
描述：传入个人陈述信息，返回 JSON 结构的陈述。

POST /generate_recommendation/
描述：传入文本生成推荐信 JSON。

请求体

{ "text": "基本信息文本..." }

响应（200 OK）

personal statement: 直接返回 JSON 对象

recommendation: 返回 JSON 对象

错误

500：解析或生成失败 routes

备注：所有 /.../ 后缀的接口，路径中含或不含斜杠均可访问，推荐前端严格按文档调用。


后端数据库部分

构建数据库时，依次执行 users.sql, documents.sql, documents_versions.sql, migration.sql 来构建数据库。