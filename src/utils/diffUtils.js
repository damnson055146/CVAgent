// utils/diffUtils.js
// 简单的文本差异对比工具，用于高亮显示修改内容

/**
 * 生成带有差异高亮的HTML
 * @param {string} originalText - 原始文本
 * @param {string} modifiedText - 修改后的文本
 * @returns {string} 带有高亮标记的HTML字符串
 */
export function getDiffHtml(originalText, modifiedText) {
  if (!originalText || !modifiedText) {
    return escapeHtml(modifiedText || originalText || '');
  }

  // 如果文本相同，直接返回
  if (originalText === modifiedText) {
    return escapeHtml(originalText);
  }

  // 基于单词的简单差异算法
  const originalWords = splitIntoWords(originalText);
  const modifiedWords = splitIntoWords(modifiedText);
  
  const diff = computeWordDiff(originalWords, modifiedWords);
  
  return renderDiffHtml(diff);
}

/**
 * 将文本分割成单词和标点符号
 */
function splitIntoWords(text) {
  // 按照空格、换行符、标点符号分割，但保留分隔符
  return text.split(/(\s+|[。，、；：！？""''（）【】《》\n\r]+)/).filter(Boolean);
}

/**
 * 计算两个单词数组的差异
 */
function computeWordDiff(original, modified) {
  const result = [];
  let i = 0, j = 0;
  
  while (i < original.length || j < modified.length) {
    if (i >= original.length) {
      // 原文已结束，剩余的都是新增
      result.push({ type: 'added', text: modified[j] });
      j++;
    } else if (j >= modified.length) {
      // 修改文已结束，剩余的都是删除
      result.push({ type: 'removed', text: original[i] });
      i++;
    } else if (original[i] === modified[j]) {
      // 相同内容
      result.push({ type: 'unchanged', text: original[i] });
      i++;
      j++;
    } else {
      // 找到下一个匹配点
      const nextMatch = findNextMatch(original, modified, i, j);
      
      if (nextMatch) {
        // 处理不匹配的部分
        for (let k = i; k < nextMatch.originalIndex; k++) {
          result.push({ type: 'removed', text: original[k] });
        }
        for (let k = j; k < nextMatch.modifiedIndex; k++) {
          result.push({ type: 'added', text: modified[k] });
        }
        i = nextMatch.originalIndex;
        j = nextMatch.modifiedIndex;
      } else {
        // 没找到匹配点，将剩余部分标记为删除和新增
        result.push({ type: 'removed', text: original[i] });
        result.push({ type: 'added', text: modified[j] });
        i++;
        j++;
      }
    }
  }
  
  return result;
}

/**
 * 查找下一个匹配点
 */
function findNextMatch(original, modified, startI, startJ) {
  const maxLookAhead = Math.min(10, original.length - startI, modified.length - startJ);
  
  for (let distance = 1; distance <= maxLookAhead; distance++) {
    // 在原文中向前查找
    if (startI + distance < original.length) {
      for (let k = 0; k <= distance && startJ + k < modified.length; k++) {
        if (original[startI + distance] === modified[startJ + k]) {
          return { originalIndex: startI + distance, modifiedIndex: startJ + k };
        }
      }
    }
    
    // 在修改文中向前查找
    if (startJ + distance < modified.length) {
      for (let k = 0; k <= distance && startI + k < original.length; k++) {
        if (modified[startJ + distance] === original[startI + k]) {
          return { originalIndex: startI + k, modifiedIndex: startJ + distance };
        }
      }
    }
  }
  
  return null;
}

/**
 * 将差异数组渲染为HTML
 */
function renderDiffHtml(diff) {
  return diff.map(item => {
    const escapedText = escapeHtml(item.text);
    
    switch (item.type) {
      case 'added':
        return `<span style="background-color: #d4edda; color: #155724; padding: 0 2px; border-radius: 2px;">${escapedText}</span>`;
      case 'removed':
        return `<span style="background-color: #f8d7da; color: #721c24; text-decoration: line-through; padding: 0 2px; border-radius: 2px;">${escapedText}</span>`;
      case 'unchanged':
      default:
        return escapedText;
    }
  }).join('');
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 获取选区高亮样式的HTML
 * 专门用于选区AI预览的高亮显示
 */
export function getSelectionDiffHtml(originalText, modifiedText, selectionStart, selectionEnd, aiSuggestion) {
  if (!originalText || typeof selectionStart !== 'number' || typeof selectionEnd !== 'number') {
    return escapeHtml(originalText || '');
  }

  const beforeSelection = originalText.substring(0, selectionStart);
  const selectedText = originalText.substring(selectionStart, selectionEnd);
  const afterSelection = originalText.substring(selectionEnd);
  
  const beforeHtml = escapeHtml(beforeSelection);
  const afterHtml = escapeHtml(afterSelection);
  
  // 高亮显示AI建议的内容
  let selectionHtml;
  if (aiSuggestion && aiSuggestion.trim()) {
    // 显示删除的原文和新增的AI建议
    selectionHtml = `<span style="background-color: #f8d7da; color: #721c24; text-decoration: line-through; padding: 0 2px; border-radius: 2px;">${escapeHtml(selectedText)}</span><span style="background-color: #d4edda; color: #155724; padding: 0 2px; border-radius: 2px; font-weight: 500;">${escapeHtml(aiSuggestion)}</span>`;
  } else {
    selectionHtml = escapeHtml(selectedText);
  }
  
  return beforeHtml + selectionHtml + afterHtml;
}

/**
 * 为全文diff预览生成更详细的对比HTML
 */
export function getDetailedDiffHtml(originalText, modifiedText, showOnlyChanges = false) {
  if (!originalText || !modifiedText) {
    return escapeHtml(modifiedText || originalText || '');
  }

  const diff = computeLineDiff(originalText, modifiedText);
  
  if (showOnlyChanges) {
    // 只显示有变化的行及其上下文
    return renderChangesOnlyHtml(diff);
  }
  
  return renderDetailedDiffHtml(diff);
}

/**
 * 基于行的差异计算
 */
function computeLineDiff(original, modified) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  const result = [];
  let i = 0, j = 0;
  
  while (i < originalLines.length || j < modifiedLines.length) {
    if (i >= originalLines.length) {
      result.push({ type: 'added', text: modifiedLines[j], lineNumber: j + 1 });
      j++;
    } else if (j >= modifiedLines.length) {
      result.push({ type: 'removed', text: originalLines[i], lineNumber: i + 1 });
      i++;
    } else if (originalLines[i] === modifiedLines[j]) {
      result.push({ type: 'unchanged', text: originalLines[i], lineNumber: i + 1 });
      i++;
      j++;
    } else {
      // 简单处理：标记为修改
      result.push({ type: 'removed', text: originalLines[i], lineNumber: i + 1 });
      result.push({ type: 'added', text: modifiedLines[j], lineNumber: j + 1 });
      i++;
      j++;
    }
  }
  
  return result;
}

/**
 * 渲染详细的差异HTML
 */
function renderDetailedDiffHtml(diff) {
  return diff.map(item => {
    const escapedText = escapeHtml(item.text);
    const lineNumber = item.lineNumber || '';
    
    switch (item.type) {
      case 'added':
        return `<div style="background-color: #d4edda; border-left: 3px solid #28a745; padding: 4px 8px; margin: 1px 0;"><span style="color: #6c757d; font-family: monospace; margin-right: 8px; font-size: 12px;">${lineNumber}</span><span style="color: #155724;">${escapedText}</span></div>`;
      case 'removed':
        return `<div style="background-color: #f8d7da; border-left: 3px solid #dc3545; padding: 4px 8px; margin: 1px 0;"><span style="color: #6c757d; font-family: monospace; margin-right: 8px; font-size: 12px;">${lineNumber}</span><span style="color: #721c24; text-decoration: line-through;">${escapedText}</span></div>`;
      case 'unchanged':
      default:
        return `<div style="padding: 4px 8px; margin: 1px 0;"><span style="color: #6c757d; font-family: monospace; margin-right: 8px; font-size: 12px;">${lineNumber}</span><span>${escapedText}</span></div>`;
    }
  }).join('');
}

/**
 * 只渲染有变化的内容
 */
function renderChangesOnlyHtml(diff) {
  const changes = [];
  let currentGroup = [];
  let hasChanges = false;
  
  diff.forEach((item, index) => {
    if (item.type !== 'unchanged') {
      hasChanges = true;
      currentGroup.push(item);
    } else {
      if (hasChanges && currentGroup.length > 0) {
        // 添加一些上下文
        const prevIndex = Math.max(0, index - 3);
        const nextIndex = Math.min(diff.length - 1, index + 2);
        
        for (let i = prevIndex; i < index; i++) {
          if (diff[i].type === 'unchanged') {
            currentGroup.unshift(diff[i]);
          }
        }
        
        currentGroup.push(item);
        
        for (let i = index + 1; i <= nextIndex; i++) {
          if (diff[i] && diff[i].type === 'unchanged') {
            currentGroup.push(diff[i]);
          }
        }
        
        changes.push([...currentGroup]);
        currentGroup = [];
        hasChanges = false;
      }
    }
  });
  
  if (hasChanges && currentGroup.length > 0) {
    changes.push(currentGroup);
  }
  
  return changes.map(group => 
    renderDetailedDiffHtml(group)
  ).join('<div style="border-top: 1px dashed #ccc; margin: 8px 0;"></div>');
}