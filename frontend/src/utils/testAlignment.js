// 测试对齐和标题渲染的修复效果
export const testAlignmentAndHeadings = () => {
  const testContent = `# 个人简历

## EDUCATION
::: left
Xi'an Jiaotong-Liverpool University
BSc Applied Mathematics
:::
::: right
Suzhou, China
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

---

普通段落文本，包含中文字符和English characters。`;

  return {
    content: testContent,
    description: '测试内容包含：\n1. 普通H1和H2标题\n2. solocenter块内的H1标题\n3. 居中对齐的列表项\n4. 复杂的嵌套格式\n5. 中英文混合内容',
    expectedResults: {
      headings: 'H1和H2标题应该正确显示大小和样式',
      centerAlignment: 'solocenter块内的内容应该居中对齐',
      h2Underline: 'H2标题应该有下划线，间距与PDF一致',
      nestedFormatting: '复杂格式如buil*ding int*ernal应该正确渲染'
    }
  };
};

// 测试markdownParser的解析结果
export const testMarkdownParsing = (content) => {
  const { parseCustomBlocks } = require('./markdownParser.js');
  
  try {
    const blocks = parseCustomBlocks(content);
    console.log('解析结果:', blocks);
    
    // 检查是否有heading类型的块
    const headingBlocks = blocks.filter(block => block.type === 'heading');
    console.log('标题块:', headingBlocks);
    
    // 检查solocenter块
    const solocenterBlocks = blocks.filter(block => block.type === 'solocenter');
    console.log('solocenter块:', solocenterBlocks);
    
    return {
      success: true,
      totalBlocks: blocks.length,
      headingBlocks: headingBlocks.length,
      solocenterBlocks: solocenterBlocks.length,
      blocks: blocks
    };
  } catch (error) {
    console.error('解析测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 