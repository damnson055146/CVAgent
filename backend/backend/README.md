平台后端文档


前端接口部分

一、公共说明

Base URL：http://<HOST>:<PORT>(后端接口为8699)

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

无

四、文档版本管理

前端接口文档

4.1 保存/更新文档
功能描述: 保存一个新版本的文档。如果该用户和类型的文档首次保存，则会自动创建父文档记录。

请求方法: POST

请求路径: /api/documents/{doc_type}/save

路径参数 (Path Parameters)
参数名	类型	是否必须	描述
doc_type	string	是	文档的类型。必须是以下值之一： resume, personal_statement, recommendation。


请求体 (Request Body)
格式: application/json

内容:

JSON

{
  "user_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "content_md": "# 我的个人陈述\n\n这是我为申请计算机科学专业准备的个人陈述..."
}

字段说明:

user_id (string, UUID): 当前操作用户的唯一标识符。

content_md (string): 文档的完整 Markdown 内容。

成功响应 (Success Response)
状态码: 200 OK

内容: 返回包含完整内容的文档对象。

JSON

{
    "id": "1d8b9b8b-3e7e-4b1b-8e1e-0b9b8b3e7e4b",
    "user_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "type": "personal_statement",
    "current_version_id": "f1e2d3c4-b5a6-9876-5432-10fedcba9876",
    "content_md": "# 我的个人陈述\n\n这是我为申请计算机科学专业准备的个人陈述...",
    "created_at": "2025-07-31T00:03:41.123Z",
    "updated_at": "2025-07-31T00:03:41.123Z"
}
错误响应 (Error Response)
422 Unprocessable Entity: 请求体或路径参数的格式不正确。

500 Internal Server Error: 服务器内部错误。

4.2 获取文档历史版本列表
功能描述: 获取指定用户和文档类型的所有历史版本的简要列表（不包含全文）。

请求方法: POST

请求路径: /api/documents/{doc_type}/history

路径参数 (Path Parameters)
参数名	类型	是否必须	描述
doc_type	string	是	文档的类型。必须是以下值之一： resume, personal_statement, recommendation。

请求体 (Request Body)
格式: application/json

内容:

JSON

{
  "user_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
字段说明:

user_id (string, UUID): 要查询的用户的唯一标识符。

成功响应 (Success Response)
状态码: 200 OK

内容: 返回一个包含历史版本对象的数组，按版本号降序排列。

JSON

[
  {
    "id": "f1e2d3c4-b5a6-9876-5432-10fedcba9876",
    "version_number": 2,
    "created_at": "2025-07-31T00:03:41.123Z",
    "content_snippet": "# 我的个人陈述\n\n这是我为申请计算机科学专业准备的个人陈述..."
  },
  {
    "id": "e0d1c2b3-a4b5-8765-4321-fedcba987654",
    "version_number": 1,
    "created_at": "2025-07-30T10:00:00.000Z",
    "content_snippet": "# 我的个人陈述\n\n初版内容..."
  }
]
错误响应 (Error Response)
404 Not Found: 找不到指定用户或类型的文档。

422 Unprocessable Entity: 请求体格式不正确。

4.3 获取指定版本全文
功能描述: 根据一个具体的版本ID，获取该版本的完整内容。

请求方法: GET

请求路径: /api/versions/{version_id}/content

路径参数 (Path Parameters)
参数名	类型	是否必须	描述
version_id	string, UUID	是	要获取其内容的具体版本ID。

请求体 (Request Body)
无

成功响应 (Success Response)
状态码: 200 OK

内容: 返回包含ID和完整内容的对象。

JSON

{
  "id": "f1e2d3c4-b5a6-9876-5432-10fedcba9876",
  "content": "# 我的个人陈述\n\n这是我为申请计算机科学专业准备的个人陈述..."
}
错误响应 (Error Response)
404 Not Found: 找不到指定的版本ID。

422 Unprocessable Entity: 提供的 version_id 不是有效的UUID格式。

4.4 删除指定版本
功能描述: 删除一个指定的文档版本，并进行权限校验。

请求方法: DELETE

请求路径: /api/versions/{version_id}/delete

路径参数 (Path Parameters)
参数名	类型	是否必须	描述
version_id	string, UUID	是	要删除的版本的ID。

请求体 (Request Body)
格式: application/json

内容:

JSON

{
  "user_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
字段说明:

user_id (string, UUID): 进行此删除操作的用户的ID，用于权限校验。

成功响应 (Success Response)
状态码: 204 No Content

内容: 响应体为空。

错误响应 (Error Response)
403 Forbidden: 当前用户无权删除此版本。

404 Not Found: 找不到指定的版本ID。

422 Unprocessable Entity: 请求体或路径参数格式不正确。

4.5 为文档生成标题
功能描述: 接收一段Markdown文本，调用AI为其生成一个合适的标题。

请求方法: POST

请求路径: /api/name-document/  (注意：此接口路径根据您之前的路由配置，前缀为 /api)

路径参数 (Path Parameters)
无

请求体 (Request Body)
格式: application/json

内容:

JSON

{
  "text": "这是一篇关于利用人工智能技术优化个人简历，以提升求职成功率的详细指南和案例分析。"
}
字段说明:

text (string): 需要生成标题的完整文档内容。

成功响应 (Success Response)
状态码: 200 OK

内容: 返回一个包含生成标题的对象。

JSON

{
  "document_name": "AI赋能：简历优化与求职成功指南"
}
错误响应 (Error Response)
422 Unprocessable Entity: 请求体格式不正确（例如text字段缺失）。

500 Internal Server Error: 后端调用AI服务时发生错误。

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