FROM registry.cn-hangzhou.aliyuncs.com/mirrors_docker_library/nginx:alpine

# 删除默认的nginx配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义的nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建日志目录
RUN mkdir -p /var/log/nginx

# 暴露端口
EXPOSE 80 443

# 启动nginx
CMD ["nginx", "-g", "daemon off;"] 