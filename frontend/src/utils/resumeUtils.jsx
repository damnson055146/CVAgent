// src/utils/resumeUtils.js
// 用于将json简历数据转换为Markdown格式，验证简历数据完整性，格式化日期等
// 还包括创建评估结果模态框和验证简历数据完整性等
/**
 * 将JSON简历数据转换为Markdown格式
 * @param {Object} data - JSON格式的简历数据
 * @returns {string} Markdown格式的简历内容
 */
export const convertJsonToMarkdown = (data) => {
    if (!data) return '';
    
    let markdown = '';
    
    // 统一标题
    if (data.user_name) {
      markdown += `# ${data.user_name}  \n`;
    }
    
    // 基本信息
    markdown += `## 基本信息\n\n`;
    if (data.user_contact_info?.phone) {
      
      markdown += `**电话：** ${data.user_contact_info.phone}   \n`;
    }
    if (data.user_contact_info?.email) {
      markdown += `**邮箱：** ${data.user_contact_info.email}    \n`;
    }
    if (data.user_location) {
      markdown += `**地址：** ${data.user_location}  \n`;
    }
    
    markdown += `\n`;
    
    // 教育背景
    if (data.user_education && data.user_education.length > 0) {
      markdown += `## 教育背景\n\n`;
      data.user_education.forEach((edu, index) => {
        // 学校-时间左右对齐块
        if (edu.user_university || edu.dates) {
          markdown += `::: left\n`;
          if (edu.user_university) markdown += `**${edu.user_university}**  \n`;
          markdown += `:::\n`;
          markdown += `::: right\n`;
          if (edu.dates) markdown += `${edu.dates}  \n`;
          markdown += `:::\n`;
        }
        if (edu.user_major) markdown += `- 专业：${edu.user_major}  \n`;
        if (edu.degree) markdown += `- 学位：${edu.degree}  \n`;
        if (edu.user_graduate_year) markdown += `- 毕业年份：${edu.user_graduate_year}  \n`;
        if (edu.user_gpa) markdown += `- GPA：${edu.user_gpa}  \n`;
        if (edu.user_language_score) markdown += `- 语言成绩：${edu.user_language_score}  \n`;
        if (edu.details) markdown += `- 详细信息：${edu.details}  \n`;
        if (index < data.user_education.length - 1) markdown += `---\n\n`;
      });
      markdown += `\n`;
    }
    
    // 实习经历
    if (data.internship_experience && data.internship_experience.length > 0) {
      markdown += `## 实习经历\n\n`;
      data.internship_experience.forEach((internship, index) => {
        // 公司-时间左右对齐块
        if (internship.company || internship.dates) {
          markdown += `::: left\n`;
          if (internship.company) markdown += `**${internship.company}**  \n`;
          if (internship.role) markdown += `*${internship.role}*  \n`;
          markdown += `:::\n`;
          markdown += `::: right\n`;
          if (internship.location) markdown += `${internship.location}  \n`;
          if (internship.dates) markdown += `${internship.dates}  \n`;
          markdown += `:::\n`;
        }
        if (internship.description_points && internship.description_points.length > 0) {
          internship.description_points.forEach(point => {
            markdown += `- ${point}  \n`;
          });
        }
        if (index < data.internship_experience.length - 1) markdown += `---\n\n`;
      });
      markdown += `\n`;
    }
    
    // 科研经历
    if (data.user_research_experience && data.user_research_experience.length > 0) {
      markdown += `## 科研经历\n\n`;
      data.user_research_experience.forEach((research, index) => {
        if (research.research_project) markdown += `**项目：** ${research.research_project}  \n`;
        if (research.role) markdown += `**角色：** ${research.role}  \n`;
        if (research.location) markdown += `**地点：** ${research.location}  \n`;
        if (research.dates) markdown += `**时间：** ${research.dates}  \n`;
        if (research.description_points && research.description_points.length > 0) {
          markdown += `**项目内容：**  \n`;
          research.description_points.forEach(point => {
            markdown += `- ${point}  \n`;
          });
        }
        if (index < data.user_research_experience.length - 1) markdown += `---\n\n`;
      });
      markdown += `\n`;
    }
    
    // 课外活动
    if (data.user_extracurricular_activities && data.user_extracurricular_activities.length > 0) {
      markdown += `## 课外活动\n\n`;
      data.user_extracurricular_activities.forEach((activity, index) => {
        if (activity.organization) markdown += `**组织：** ${activity.organization}  \n`;
        if (activity.role) markdown += `**角色：** ${activity.role}  \n`;
        if (activity.location) markdown += `**地点：** ${activity.location}  \n`;
        if (activity.dates) markdown += `**时间：** ${activity.dates}  \n`;
        if (activity.description_points && activity.description_points.length > 0) {
          markdown += `**活动内容：**  \n`;
          activity.description_points.forEach(point => {
            markdown += `- ${point}  \n`;
          });
        }
        if (index < data.user_extracurricular_activities.length - 1) markdown += `---\n\n`;
      });
      markdown += `\n`;
    }
    
    return markdown;
  };
  
  /**
   * 创建评估结果模态框
   * @param {string} markdownContent - Markdown格式的评估结果
   */
  export const showEvaluationModal = (markdownContent) => {
    const modal = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (!modal) {
      alert('无法打开弹窗，请检查浏览器设置');
      return;
    }
    
    modal.document.write(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>简历评估结果</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.1.0/github-markdown.min.css">
        <style>
          body { 
            padding: 20px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .markdown-body { 
            max-width: 800px; 
            margin: 0 auto; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            padding: 30px;
            border-radius: 8px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #007cba;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
          }
          .print-btn:hover {
            background: #005a87;
          }
          @media print {
            .print-btn { display: none; }
            body { padding: 0; }
            .markdown-body { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">打印报告</button>
        <div class="markdown-body">
          <div class="header">
            <h1>简历评估报告</h1>
            <p style="color: #666; margin: 0;">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
          </div>
          ${markdownContent}
        </div>
        <script>
          // 自动聚焦窗口
          window.focus();
          
          // 添加键盘快捷键
          document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
              e.preventDefault();
              window.print();
            }
            if (e.key === 'Escape') {
              window.close();
            }
          });
        </script>
      </body>
      </html>
    `);
    
    modal.document.close();
  };
  
  /**
   * 验证简历数据完整性
   * @param {Object} data - 简历数据对象
   * @returns {Object} { isValid: boolean, missingFields: string[] }
   */
  export const validateResumeData = (data) => {
    const missingFields = [];
    
    if (!data) {
      return { isValid: false, missingFields: ['所有数据'] };
    }
    
    if (!data.user_name?.trim()) {
      missingFields.push('姓名');
    }
    
    if (!data.user_contact_info?.email?.trim() && !data.user_contact_info?.phone?.trim()) {
      missingFields.push('联系方式');
    }
    
    if (!data.user_education?.length) {
      missingFields.push('教育背景');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };
  
  /**
   * 格式化日期字符串
   * @param {string} dateStr - 日期字符串
   * @returns {string} 格式化后的日期
   */
  export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    // 简单的日期格式化逻辑
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr; // 如果无法解析，返回原字符串
    }
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit'
    });
  };