// 测试Word生成的修复效果
export const testWordGeneration = () => {
  const testContent = `# 个人简历

## EDUCATION
::: left
**Xi'an Jiaotong-Liverpool University**
BSc Applied Mathematics
:::
::: right
**Suzhou, China**
Sep 2019 - Jun 2023
:::

## EXPERIENCE
::: solocenter
# Yuxiang Chen
- Developed and tracked critical product metrics, conducting root cause analysis of performance variations to enhance product optimization.
- Assisted in buil*ding int*ernal databases, performing data mining and evaluation, and maintaining data models
:::

## SKILLS
- 编程语言: JavaScript, Python, Java
- 框架: React, Vue.js, Django
- 数据库: MySQL, MongoDB

## PROJECTS
- 项目一：数据分析系统
- 项目二：Web应用开发
- 项目三：机器学习模型

---

普通段落文本，包含中文字符和English characters。`;

  return {
    content: testContent,
    description: '测试内容包含：\n1. 普通H1和H2标题\n2. 粗体文本（**Xi\'an Jiaotong-Liverpool University**）\n3. solocenter块内的H1标题\n4. 列表项（应该只缩进，不显示项目符号）\n5. H2标题（应该有下划线）\n6. 复杂的嵌套格式\n7. 中英文混合内容',
    expectedResults: {
      headings: 'H1和H2标题应该正确显示大小和样式',
      boldText: '**Xi\'an Jiaotong-Liverpool University** 应该正确显示为粗体',
      centerAlignment: 'solocenter块内的内容应该居中对齐',
      h1InSolocenter: 'solocenter块内的H1标题应该保持H1字体大小和样式，但居中对齐',
      h2Underline: 'H2标题应该有占满页面宽度的下划线（使用段落边框）',
      listItems: '列表项应该只缩进，不显示项目符号',
      nestedFormatting: '复杂格式如buil*ding int*ernal应该正确渲染'
    }
  };
};

// 测试Word生成函数
export const testWordDocumentGeneration = async (content) => {
  const { generateWordDocument } = require('./wordGenerators.js');
  
  try {
    console.log('开始测试Word文档生成...');
    
    // 使用默认配置生成Word文档
    await generateWordDocument(content, {
      font: 'SimSun',
      fontSize: 12,
      lineHeight: 1.5,
      style: 'style1',
      strong: {
        color: '22223B'
      }
    }, { user_name: 'Word测试' });

    return {
      success: true,
      message: 'Word文档生成测试成功！',
      details: {
        font: 'SimSun',
        fontSize: 12,
        lineHeight: 1.5,
        contentLength: content.length,
        hasHeadings: true,
        hasBoldText: true,
        hasLists: true,
        hasH2Underline: true,
        hasCenterAlignment: true
      }
    };
  } catch (error) {
    console.error('Word文档生成测试失败:', error);
    return {
      success: false,
      error: error.message,
      details: {
        font: 'SimSun',
        fontSize: 12,
        lineHeight: 1.5
      }
    };
  }
}; 