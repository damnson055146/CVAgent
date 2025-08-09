# Markdown 渲染功能测试

## 测试用例

### 测试1：基本Markdown格式

```markdown
# Yuxiang Chen
## 个人信息
**姓名**: Chen
*年龄*: 37

这是一个普通段落，包含**粗体**和*斜体*文本。

- 列表项1
- 列表项2
- 列表项3
```

**预期结果**：
- `# Yuxiang Chen` 应该渲染为H1标题
- `## 个人信息` 应该渲染为H2标题
- `**姓名**: Chen` 应该渲染为粗体
- `*年龄*: 37` 应该渲染为斜体
- 普通段落应该正确显示
- 列表应该正确渲染

### 测试2：左右分栏布局

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

**预期结果**：
- 应该解析为row类型块
- 左侧内容左对齐显示
- 右侧内容右对齐显示
- 粗体和斜体格式正确渲染

### 测试3：对齐块

```markdown
::: center
# 居中的标题
**居中的粗体文本**
:::

::: left
左对齐的内容
*斜体文本*
:::

::: right
右对齐的内容
**粗体文本**
:::
```

**预期结果**：
- center块内容居中对齐
- left块内容左对齐
- right块内容右对齐
- 所有Markdown格式正确渲染

### 测试4：混合内容

```markdown
# 简历标题

::: left
**姓名**: Yuxiang Chen
**邮箱**: chen@example.com
:::
::: right
**电话**: 123-456-7890
**地址**: Shanghai, China
:::

## 工作经验

**公司名称**: ABC Corp
*职位*: Software Engineer
*时间*: 2020-2022

### 工作职责
- 负责前端开发
- 参与项目设计
- 代码审查和维护
```

**预期结果**：
- 所有标题层级正确渲染
- 左右分栏正确显示
- 粗体和斜体格式正确
- 列表正确渲染

## 当前实现分析

### CustomMarkdownPage组件

当前的CustomMarkdownPage组件应该能正确处理以下块类型：

1. **row**: 左右分栏布局
   ```jsx
   case 'row':
     return (
       <div key={key} className="flex justify-between mb-2">
         <div className="text-left flex-1">
           <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.left || ''}</ReactMarkdown>
         </div>
         <div className="text-right flex-1">
           <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.right || ''}</ReactMarkdown>
         </div>
       </div>
     );
   ```

2. **left/right/center**: 对齐块
   ```jsx
   case 'left':
   case 'sololeft':
     return (
       <div key={key} className="text-left mb-2">
         <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content || ''}</ReactMarkdown>
       </div>
     );
   ```

3. **normal**: 普通内容
   ```jsx
   case 'normal':
   default:
     return (
       <div key={key} className="mb-2">
         <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content || ''}</ReactMarkdown>
       </div>
     );
   ```

### parseCustomBlocks函数

parseCustomBlocks函数应该正确解析内容：

1. **标题**: `# 标题` → `{ type: 'normal', content: '# 标题' }`
2. **粗体**: `**文本**` → 保持原样，由ReactMarkdown处理
3. **斜体**: `*文本*` → 保持原样，由ReactMarkdown处理
4. **左右分栏**: `::: left` + `::: right` → `{ type: 'row', left: '...', right: '...' }`

## 可能的问题

### 1. 内容解析问题

检查parseCustomBlocks是否正确解析内容：

```javascript
// 在RenderPreview组件中添加调试日志
useEffect(() => {
  if (content) {
    try {
      const parsedBlocks = parseCustomBlocks(content);
      console.log('解析的块:', parsedBlocks);
      setBlocks(parsedBlocks);
      
      // 将块分页
      const styleConfig = {
        font: config?.font || 'SimSun',
        fontSize: config?.fontSize || 12,
        lineHeight: config?.lineHeight || 1.5,
        maxContentHeight: MAX_CONTENT_HEIGHT
      };
      const pageBlocks = renderBlocksToPages(parsedBlocks, styleConfig, measurerRef);
      console.log('分页结果:', pageBlocks);
      setPages(pageBlocks);
    } catch (error) {
      console.error('解析内容时出错:', error);
      setBlocks([]);
      setPages([]);
    }
  }
}, [content, config]);
```

### 2. ReactMarkdown配置问题

确保ReactMarkdown正确配置：

```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 使用remarkGfm插件支持GitHub风格的Markdown
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {content}
</ReactMarkdown>
```

### 3. CSS样式问题

确保CSS样式正确应用：

```css
.prose h1 {
  font-size: calc(1.833 * var(--base-font-size, 12pt));
  font-weight: bold;
  color: rgb(0, 0, 0);
  margin-bottom: 1.2rem;
  padding-bottom: 0.5rem;
  letter-spacing: 1px;
}

.prose h2 {
  font-size: calc(1.25 * var(--base-font-size, 12pt));
  color: #0e2954;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  border-bottom: 1px solid rgb(73, 73, 73);
  padding-left: 0.6rem;
  padding-bottom: 0.5rem;
}

.prose strong {
  color: #22223b;
  font-weight: bold;
}
```

## 调试步骤

1. **检查控制台日志**
   - 查看parseCustomBlocks的输出
   - 查看分页结果
   - 查看CustomMarkdownPage的渲染日志

2. **检查DOM结构**
   - 使用浏览器开发者工具检查渲染的HTML
   - 确认Markdown标记是否正确转换为HTML

3. **测试简单内容**
   - 先测试简单的Markdown格式
   - 逐步增加复杂度

4. **验证样式应用**
   - 检查CSS类是否正确应用
   - 确认字体和颜色设置

## 预期结果

修复后，以下内容应该正确渲染：

```markdown
# Yuxiang Chen
**姓名**: Chen
*年龄*: 37

::: left
**公司**: ABC Corp
*职位*: Engineer
:::
::: right
**地点**: Shanghai
*时间*: 2022-2023
:::
```

- H1标题：大号粗体，黑色
- 粗体文本：深色，加粗
- 斜体文本：斜体样式
- 左右分栏：左侧左对齐，右侧右对齐
- 所有Markdown格式正确渲染 