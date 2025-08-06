// src/CVcomponents/RenderPreview.jsx

const RenderPreview = forwardRef(({ content, config = DEFAULT_CONFIG, resumeData, theme = 'style1' }, ref) => {
  // ... 其他 state 和 ref ...

  const generatePDF = useCallback(async () => {
    setLoading(true);
    try {
      console.log('准备调用PDF生成函数...');
      
      if (!content || content.trim() === '') {
        throw new Error('没有内容可生成PDF');
      }
      
      // 直接调用我们新的、健壮的PDF生成函数
      await generatePdfWithCustomFont(content, config, resumeData);

    } catch (error) {
      console.error('生成PDF过程中发生错误:', error);
      alert(`生成PDF失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [content, config, resumeData]);

  // ... generateWord 和其他代码保持不变 ...

  // ... return JSX ...
});

// 确保从文件中导出了新的函数，虽然在本文件使用不需要，但好习惯
export default RenderPreview;