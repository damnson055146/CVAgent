// src/CVcomponents/ResumeForm.jsx
// 简历表单组件，允许用户填写和编辑简历信息
import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const ResumeForm = ({ onClose, onSubmit }) => {
  // 表单步骤控制
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // 基本信息
    basicInfo: {
      name: '',
      gender: '男',
      phone: '',
      email: '',
      location: '',
    },
    // 教育背景 (支持多段教育经历)
    education: [
      {
        university: '',
        major: '',
        degree: '本科',
        startDate: '',
        endDate: '',
        gpa: '',
        majorCourses: '',
        languageScores: {
          ielts: '',
          toefl: '',
          gre: ''
        }
      }
    ],
    // 工作/实习经历
    experiences: [
      {
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        descriptionPoints: ['']
      }
    ],
    // 科研经历
    research: [
      {
        research_project: '',
        role: '',
        location: '',
        dates: '',
        descriptionPoints: ['']
      }
    ],
    // 获奖经历
    awards: [
      {
        name: '',
        date: '',
        organization: '',
        description: ''
      }
    ],
    // 课外活动
    extracurricular: [
      {
        organization: '',
        role: '',
        location: '',
        dates: '',
        descriptionPoints: ['']
      }
    ]
  });

  const handleChange = (section, field, value, index = null, subField = null) => {
    setFormData(prevData => {
      const newData = { ...prevData };
      
      if (subField !== null && index !== null) {
        // 处理嵌套数组字段 (如 experiences.descriptionPoints)
        newData[section] = [...newData[section]];
        newData[section][index] = { ...newData[section][index], [subField]: value };
      } 
      else if (index !== null) {
        // 处理数组字段
        newData[section] = [...newData[section]];
        newData[section][index] = { ...newData[section][index], [field]: value };
      } 
      else {
        // 处理普通对象字段 (如 basicInfo)
        newData[section] = { ...newData[section], [field]: value };
      }
      
      return newData;
    });
  };

  // 添加新的条目 (教育/经历等)
  const addItem = (section, template) => {
    setFormData({
      ...formData,
      [section]: [...formData[section], { ...template }]
    });
  };

  // 删除条目
  const removeItem = (section, index) => {
    const newItems = [...formData[section]];
    newItems.splice(index, 1);
    setFormData({ ...formData, [section]: newItems });
  };

  // 提交表单
  const handleSubmit = () => {
    // 只生成基本信息、教育背景、实习经历、科研经历、课外活动、获奖经历
    const resumeJson = {
      user_name: formData.basicInfo.name,
      user_contact_info: {
        phone: formData.basicInfo.phone,
        email: formData.basicInfo.email
      },
      user_location: formData.basicInfo.location,
      user_target: formData.basicInfo.target,
      user_education: formData.education.map(edu => ({
        user_university: edu.university,
        user_major: edu.major,
        degree: edu.degree,
        dates: `${edu.startDate} - ${edu.endDate}`,
        user_gpa: edu.gpa,
        details: edu.majorCourses
      })),
      internship_experience: formData.experiences.map(exp => ({
        company: exp.company,
        role: exp.position,
        dates: `${exp.startDate} - ${exp.endDate}`,
        description_points: exp.descriptionPoints.filter(p => p.trim() !== '')
      })),
      user_research_experience: formData.research
        .filter(r => r.research_project.trim() !== '')
        .map(r => ({
          research_project: r.research_project,
          role: r.role,
          location: r.location,
          dates: r.dates,
          description_points: r.descriptionPoints.filter(p => p.trim() !== '')
        })),
      user_extracurricular_activities: formData.extracurricular
        .filter(act => act.organization.trim() !== '')
        .map(act => ({
          organization: act.organization,
          role: act.role,
          location: act.location,
          dates: act.dates,
          description_points: act.descriptionPoints.filter(p => p.trim() !== '')
        })),
      user_awards: formData.awards
        .filter(a => a.name.trim() !== '')
        .map(a => ({
          name: a.name,
          date: a.date,
          organization: a.organization,
          description: a.description
        }))
    };
    onSubmit(resumeJson);
    onClose();
  };

  // 渲染当前步骤的表单
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名*</label>
                <input
                  type="text"
                  value={formData.basicInfo.name || ''}
                  onChange={(e) => handleChange('basicInfo', 'name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                <select
                  value={formData.basicInfo.gender || ''}
                  onChange={(e) => handleChange('basicInfo', 'gender', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
                <input
                  type="month"
                  value={formData.basicInfo.birthDate || ''}
                  onChange={(e) => handleChange('basicInfo', 'birthDate', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话*</label>
                <input
                  type="tel"
                  value={formData.basicInfo.phone || ''}
                  onChange={(e) => handleChange('basicInfo', 'phone', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱*</label>
                <input
                  type="email"
                  value={formData.basicInfo.email || ''}
                  onChange={(e) => handleChange('basicInfo', 'email', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
              <input
                type="text"
                value={formData.basicInfo.location || ''}
                onChange={(e) => handleChange('basicInfo', 'location', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
           
          </div>
        );
      
        case 2:
          return (
            <div className="space-y-4">
              {/* 教育背景部分 */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">教育背景</h3>
                <button
                  type="button"
                  onClick={() => addItem('education', {
                    university: '',
                    major: '',
                    degree: '本科',
                    startDate: '',
                    endDate: '',
                    gpa: '',
                    majorCourses: ''
                  })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + 添加教育经历
                </button>
              </div>
              
              {formData.education.map((edu, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-medium">教育经历 #{index + 1}</h4>
                    {formData.education.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem('education', index)}
                        className="text-red-500 text-sm"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">学校名称*</label>
                      <input
                        type="text"
                        value={edu.university || ''}
                        onChange={(e) => handleChange('education', 'university', e.target.value, index)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">专业*</label>
                      <input
                        type="text"
                        value={edu.major || ''}
                        onChange={(e) => handleChange('education', 'major', e.target.value, index)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">学位</label>
                      <select
                        value={edu.degree || ''}
                        onChange={(e) => handleChange('education', 'degree', e.target.value, index)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="高中">高中</option>
                        <option value="本科">本科</option>
                        <option value="硕士">硕士</option>
                        <option value="博士">博士</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                      <input
                        type="month"
                        value={edu.startDate || ''}
                        onChange={(e) => handleChange('education', 'startDate', e.target.value, index)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                      <input
                        type="month"
                        value={edu.endDate || ''}
                        onChange={(e) => handleChange('education', 'endDate', e.target.value, index)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
                      <input
                        type="text"
                        value={edu.gpa || ''}
                        onChange={(e) => handleChange('education', 'gpa', e.target.value, index)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="例如: 3.8/4.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">主修科目</label>
                      <input
                        type="text"
                        value={edu.majorCourses || ''}
                        onChange={(e) => handleChange('education', 'majorCourses', e.target.value, index)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="例如: 数据结构,算法分析"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 标准化成绩部分 - 单独分组 */}
              <div className="border border-gray-200 rounded-lg p-4 mt-6">
                <h3 className="text-lg font-medium mb-4">标准化成绩</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">雅思成绩</label>
                    <input
                      type="text"
                      value={formData.education[0]?.languageScores?.ielts || ''}
                      onChange={(e) => handleChange('education', 'languageScores', {...formData.education[0].languageScores, ielts: e.target.value}, 0, 'languageScores')}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="例如: 7.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">托福成绩</label>
                    <input
                      type="text"
                      value={formData.education[0]?.languageScores?.toefl || ''}
                      onChange={(e) => handleChange('education', 'languageScores', {...formData.education[0].languageScores, toefl: e.target.value}, 0, 'languageScores')}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="例如: 110"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GRE成绩</label>
                    <input
                      type="text"
                      value={formData.education[0]?.languageScores?.gre || ''}
                      onChange={(e) => handleChange('education', 'languageScores', {...formData.education[0].languageScores, gre: e.target.value}, 0, 'languageScores')}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="例如: 325"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
           /* ------------  第 3 步：工作 / 实习经历  ------------ */
           case 3:
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">工作 / 实习经历</h3>
                  <button
                    type="button"
                    onClick={() =>
                      addItem('experiences', {
                        company: '',
                        position: '',
                        startDate: '',
                        endDate: '',
                        descriptionPoints: ['']
                      })
                    }
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + 添加经历
                  </button>
                </div>
    
                {formData.experiences.map((exp, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between mb-2">
                      <h4 className="font-medium">经历 #{idx + 1}</h4>
                      {formData.experiences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem('experiences', idx)}
                          className="text-red-500 text-sm"
                        >
                          删除
                        </button>
                      )}
                    </div>
    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">公司 / 组织*</label>
                        <input
                          type="text"
                          value={exp.company || ''}
                          onChange={(e) => handleChange('experiences', 'company', e.target.value, idx)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">职位*</label>
                        <input
                          type="text"
                          value={exp.position || ''}
                          onChange={(e) => handleChange('experiences', 'position', e.target.value, idx)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                    </div>
    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                        <input
                          type="month"
                          value={exp.startDate || ''}
                          onChange={(e) => handleChange('experiences', 'startDate', e.target.value, idx)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                        <input
                          type="month"
                          value={exp.endDate || ''}
                          onChange={(e) => handleChange('experiences', 'endDate', e.target.value, idx)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述要点</label>
                      {exp.descriptionPoints.map((point, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={point || ''}
                            onChange={(e) => {
                              const newPoints = [...exp.descriptionPoints];
                              newPoints[pIdx] = e.target.value;
                              handleChange('experiences', 'descriptionPoints', newPoints, idx);
                            }}
                            placeholder="例如：负责 xxx 模块开发"
                            className="flex-1 p-2 border border-gray-300 rounded-md"
                          />
                          {exp.descriptionPoints.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPoints = [...exp.descriptionPoints];
                                newPoints.splice(pIdx, 1);
                                handleChange('experiences', 'descriptionPoints', newPoints, idx);
                              }}
                              className="text-red-500 text-xs"
                            >
                              删
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          handleChange(
                            'experiences',
                            'descriptionPoints',
                            [...exp.descriptionPoints, ''],
                            idx
                          )
                        }
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        + 添加要点
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
     /* ------------  第 4 步：获奖经历  ------------ */
            case 4:
              return (
                <div className="space-y-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">获奖经历</h3>
                    <button
                      type="button"
                      onClick={() => addItem('awards', {
                        name: '',
                        date: '',
                        organization: '',
                        description: ''
                      })}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + 添加获奖经历
                    </button>
                  </div>
      
                  {formData.awards.map((award, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium">获奖 #{idx + 1}</h4>
                        {formData.awards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem('awards', idx)}
                            className="text-red-500 text-sm"
                          >
                            删除
                          </button>
                        )}
                      </div>
      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">奖项名称*</label>
                          <input
                            type="text"
                            value={award.name || ''}
                            onChange={(e) => handleChange('awards', 'name', e.target.value, idx)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">颁发机构</label>
                          <input
                            type="text"
                            value={award.organization || ''}
                            onChange={(e) => handleChange('awards', 'organization', e.target.value, idx)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">获奖时间</label>
                        <input
                          type="month"
                          value={award.date || ''}
                          onChange={(e) => handleChange('awards', 'date', e.target.value, idx)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">奖项描述</label>
                        <textarea
                          value={award.description || ''}
                          onChange={(e) => handleChange('awards', 'description', e.target.value, idx)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="例如：全校前5%学生获得，表彰学术卓越表现"
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
         /* ------------  第 5 步：课外活动  ------------ */
            case 5:
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">课外活动</h3>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          extracurricular: [
                            ...formData.extracurricular,
                            {
                              organization: '',
                              role: '',
                              location: '',
                              dates: '',
                              descriptionPoints: ['']
                            }
                          ]
                        })}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + 添加活动
                      </button>
                    </div>
              
                    {formData.extracurricular.map((activity, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                        <div className="flex justify-between mb-3">
                          <h4 className="font-medium">课外活动 #{index + 1}</h4>
                          {formData.extracurricular.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newActivities = [...formData.extracurricular];
                                newActivities.splice(index, 1);
                                setFormData({ ...formData, extracurricular: newActivities });
                              }}
                              className="text-red-500 text-sm"
                            >
                              删除
                            </button>
                          )}
                        </div>
              
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">组织名称*</label>
                            <input
                              type="text"
                              value={activity.organization || ''}
                              onChange={(e) => {
                                const newActivities = [...formData.extracurricular];
                                newActivities[index].organization = e.target.value;
                                setFormData({ ...formData, extracurricular: newActivities });
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">担任角色</label>
                            <input
                              type="text"
                              value={activity.role || ''}
                              onChange={(e) => {
                                const newActivities = [...formData.extracurricular];
                                newActivities[index].role = e.target.value;
                                setFormData({ ...formData, extracurricular: newActivities });
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="例如：运营部部长"
                            />
                          </div>
                        </div>
              
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
                            <input
                              type="text"
                              value={activity.location || ''}
                              onChange={(e) => {
                                const newActivities = [...formData.extracurricular];
                                newActivities[index].location = e.target.value;
                                setFormData({ ...formData, extracurricular: newActivities });
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="例如：校内/北京"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
                            <input
                              type="text"
                              value={activity.dates || ''}
                              onChange={(e) => {
                                const newActivities = [...formData.extracurricular];
                                newActivities[index].dates = e.target.value;
                                setFormData({ ...formData, extracurricular: newActivities });
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="例如：2019/03 - 2020/12"
                            />
                          </div>
                        </div>
              
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">活动描述</label>
                          {activity.descriptionPoints.map((point, pointIndex) => (
                            <div key={pointIndex} className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={point || ''}
                                onChange={(e) => {
                                  const newActivities = [...formData.extracurricular];
                                  newActivities[index].descriptionPoints[pointIndex] = e.target.value;
                                  setFormData({ ...formData, extracurricular: newActivities });
                                }}
                                className="flex-1 p-2 border border-gray-300 rounded-md"
                                placeholder="例如：组织社团活动、提升成员参与度"
                              />
                              {activity.descriptionPoints.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newActivities = [...formData.extracurricular];
                                    newActivities[index].descriptionPoints.splice(pointIndex, 1);
                                    setFormData({ ...formData, extracurricular: newActivities });
                                  }}
                                  className="text-red-500 text-sm"
                                >
                                  删除
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newActivities = [...formData.extracurricular];
                              newActivities[index].descriptionPoints.push('');
                              setFormData({ ...formData, extracurricular: newActivities });
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + 添加描述要点
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">填写简历信息</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {/* 步骤指示器 */}
          <div className="flex justify-center mb-6">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === stepNum
                      ? 'bg-blue-600 text-white'
                      : step > stepNum
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {step > stepNum ? <Check size={16} /> : stepNum}
                </div>
                {stepNum < 5 && (
                  <div className={`w-12 h-1 ${step > stepNum ? 'bg-green-100' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          
          {renderStep()}
        </div>
        
        <div className="flex justify-between p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> 上一步
          </button>
          
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              下一步 <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md"
            >
              完成并生成简历 <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeForm;