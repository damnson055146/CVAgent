import React from 'react';

const LandingPage = ({ onStartExplore }) => {
  const features = [
    {
      title: "智能简历解析",
      description: "AI深度分析简历内容，自动提取关键信息，生成结构化数据"
    },
    {
      title: "简历优化建议",
      description: "基于行业标准，提供专业的简历优化建议，提升竞争力"
    },
    {
      title: "个人陈述生成",
      description: "AI辅助生成个性化个人陈述，突出个人优势与目标"
    },
    {
      title: "推荐信撰写",
      description: "智能生成推荐信模板，展现申请者的专业能力与品格"
    },
    {
      title: "文本智能处理",
      description: "支持文本扩展、收缩、优化，让表达更加精准专业"
    },
    {
      title: "实时预览编辑",
      description: "所见即所得的编辑体验，实时预览修改效果"
    }
  ];

  const stats = [
    { number: "10+", label: "AI模型" },
    { number: "50+", label: "行业模板" },
    { number: "1000+", label: "成功案例" },
    { number: "24/7", label: "在线服务" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl sm:text-2xl font-bold">CV Agent</div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="hover:text-blue-200 transition-colors">功能</a>
              <a href="#about" className="hover:text-blue-200 transition-colors">关于</a>
              <a href="#contact" className="hover:text-blue-200 transition-colors">联系</a>
            </nav>
            <div className="md:hidden">
              <div className="w-8 h-8 bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                IM
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            AI驱动的
            <span className="text-blue-600">留学申请助手</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto px-4">
            运用先进的人工智能技术，为您的留学申请提供全方位的智能支持。
            从简历优化到个人陈述，从推荐信撰写到申请材料完善，让AI成为您的专业助手。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <button 
              onClick={onStartExplore}
              className="bg-blue-600 text-white px-8 py-4 text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              开始探索
            </button>
            <button className="border-2 border-blue-600 text-blue-600 px-8 py-4 text-lg font-semibold hover:bg-blue-50 transition-colors">
              了解更多
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-sm sm:text-base text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">核心功能</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              专为留学申请设计的AI工具集，让您的申请材料更加专业和出色
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white border border-gray-200 p-6 sm:p-8 hover:border-blue-300 transition-colors">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 flex items-center justify-center mb-4">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600"></div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">使用流程</h2>
            <p className="text-lg sm:text-xl text-gray-600 px-4">简单三步，完成专业申请材料</p>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-lg sm:text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">上传材料</h3>
              <p className="text-sm sm:text-base text-gray-600">上传您的简历、个人信息或相关材料</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-lg sm:text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">AI处理</h3>
              <p className="text-sm sm:text-base text-gray-600">AI智能分析并生成优化建议</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-lg sm:text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">下载结果</h3>
              <p className="text-sm sm:text-base text-gray-600">获得专业优化的申请材料</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-blue-600">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">准备开始您的留学之旅？</h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto px-4">
            立即体验AI驱动的留学申请助手，让您的申请材料脱颖而出
          </p>
          <button 
            onClick={onStartExplore}
            className="bg-white text-blue-600 px-8 py-4 text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            免费开始使用
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <div className="text-xl sm:text-2xl font-bold mb-4">CV Agent</div>
              <p className="text-sm sm:text-base text-gray-400">AI驱动的留学申请助手，让您的申请更加专业和出色。</p>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4">产品</h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">简历优化</a></li>
                <li><a href="#" className="hover:text-white transition-colors">个人陈述</a></li>
                <li><a href="#" className="hover:text-white transition-colors">推荐信</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4">支持</h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">帮助中心</a></li>
                <li><a href="#" className="hover:text-white transition-colors">联系我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors">使用指南</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4">公司</h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">关于我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors">隐私政策</a></li>
                <li><a href="#" className="hover:text-white transition-colors">服务条款</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400">
            <p className="text-sm sm:text-base">&copy; 2024 CV Agent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 