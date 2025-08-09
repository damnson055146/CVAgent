# 成对 left/right 块渲染修复

## 问题描述

用户报告成对的 `::: left` 和 `::: right` 块没有正确渲染为左右分栏布局。

### 示例内容
```markdown
::: left
**Haitong Securities**  
*Investment Analysis Intern*  
:::
::: right
**Shanghai, China**  
Jun 2022 - Aug 2022  
:::
```

**期望效果**：
- **Haitong Securities** 和 **Shanghai, China** 在同一行
- *Investment Analysis Intern* 和 Jun 2022 - Aug 2022 在同一行

**实际效果**：
- 两个块被分别渲染，没有形成左右分栏布局

## 问题原因

原来的 `markdownParser.js` 中的 `parseCustomBlocks` 函数没有正确处理成对的 `::: left` 和 `::: right` 块。它只是简单地按顺序处理每个块，没有识别它们应该组合成左右分栏布局。

## 解决方案

### 1. 重写 parseCustomBlocks 函数

新的解析逻辑能够：
- 识别成对的 `::: left` 和 `::: right` 块
- 将它们转换为 `row` 类型的块
- 支持嵌套块的处理
- 保持其他对齐块类型的正常处理

### 2. 关键改进

```javascript
// 检查是否是成对的 left/right 布局
if (/^::: ?left(#.*)?$/.test(lines[i])) {
  let leftLines = [];
  let nestedBlocks = [];
  i++;
  
  // 收集左块内容
  while (i < lines.length && !/^:::$/.test(lines[i])) {
    if (lines[i].trim() !== '') {
      leftLines.push(lines[i]);
    }
    i++;
  }
  i++;
  
  // 检查后面是否有右对齐块
  if (i < lines.length && /^::: ?right(#.*)?$/.test(lines[i])) {
    let rightLines = [];
    i++;
    while (i < lines.length && !/^:::$/.test(lines[i])) {
      if (lines[i].trim() !== '') rightLines.push(lines[i]);
      i++;
    }
    i++;
    
    // 创建左右分栏行
    const maxLen = Math.max(leftLines.length, rightLines.length);
    for (let j = 0; j < maxLen; j++) {
      blocks.push({ type: 'row', left: leftLines[j] || '', right: rightLines[j] || '' });
    }
    continue;
  }
}
```

### 3. 更新渲染逻辑

在 `renderBlocksToPages` 函数中添加了对 `row` 类型块的处理：

```javascript
case 'row':
  // 左右分栏布局，测量左右内容的最大高度
  const leftContent = block.left || '';
  const rightContent = block.right || '';
  const maxContent = leftContent.length > rightContent.length ? leftContent : rightContent;
  content = maxContent;
  measurer.style.fontSize = `${config.fontSize}px`;
  measurer.style.fontWeight = 'normal';
  break;
```

### 4. 更新 CustomMarkdownPage 组件

确保 `CustomMarkdownPage` 组件能够正确渲染 `row` 类型的块：

```javascript
case 'row':
  return (
    <div key={key} className="flex justify-between mb-2">
      <span>{block.left || ''}</span>
      <span>{block.right || ''}</span>
    </div>
  );
```

## 测试用例

### 测试1：基本左右分栏
```markdown
::: left
**Company Name**
*Position*
:::
::: right
**Location**
*Date*
:::
```

**预期结果**：
- 第一行：**Company Name** 左对齐，**Location** 右对齐
- 第二行：*Position* 左对齐，*Date* 右对齐

### 测试2：不等长内容
```markdown
::: left
**Short**
*Long description that spans multiple lines*
:::
::: right
**Very long company name**
*Short*
:::
```

**预期结果**：
- 自动处理不等长内容，保持对齐

### 测试3：嵌套块
```markdown
::: left
::: center
**Nested Content**
:::
*Regular content*
:::
::: right
**Right content**
:::
```

**预期结果**：
- 正确处理嵌套的对齐块

## 文件变更

### 主要修改文件
- `frontend/src/utils/markdownParser.js` - 重写解析逻辑

### 修改内容
1. **parseCustomBlocks 函数** - 完全重写，支持成对块识别
2. **renderBlocksToPages 函数** - 添加 row 类型块处理
3. **getBlockContentPreview 函数** - 更新预览逻辑

### 新增功能
- 成对 left/right 块识别
- 左右分栏布局生成
- 嵌套块支持
- 调试日志输出

## 验证方法

1. **控制台日志**：查看解析过程的详细日志
2. **预览效果**：检查左右分栏是否正确显示
3. **PDF生成**：验证PDF中的左右分栏布局
4. **Word生成**：验证Word文档中的左右分栏布局

## 注意事项

1. **向后兼容**：保持对现有单独对齐块的支持
2. **性能优化**：添加了调试日志，生产环境可移除
3. **错误处理**：增强了对异常情况的处理
4. **递归支持**：支持嵌套块的正确解析

## 相关文件

- `frontend/src/CVcomponents/RenderPreview.jsx` - 预览组件
- `frontend/src/CVcomponents/PreviewEditor.jsx` - 编辑组件
- `frontend/src/utils/pdfGenerators.js` - PDF生成
- `frontend/src/utils/wordGenerators.js` - Word生成 