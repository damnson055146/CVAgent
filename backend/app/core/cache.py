import json
import hashlib
import asyncio
from typing import Optional, Any, Dict
from collections import OrderedDict
import redis.asyncio as redis
from app.core.config import settings

class DualCache:
    """双重缓存系统：软缓存（内存）+ 硬缓存（Redis）"""
    
    def __init__(self):
        self.soft_cache: OrderedDict = OrderedDict()
        self.redis_client: Optional[redis.Redis] = None
        self.max_soft_cache_size = settings.SOFT_CACHE_SIZE
        
    async def init_redis(self):
        """初始化Redis连接"""
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL)
            await self.redis_client.ping()
            print("✅ Redis连接成功")
        except Exception as e:
            print(f"⚠️ Redis连接失败: {e}")
            self.redis_client = None
    
    def _generate_cache_key(self, data: Dict[str, Any]) -> str:
        """生成缓存键"""
        # 对数据进行排序以确保一致性
        sorted_data = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(sorted_data.encode('utf-8')).hexdigest()
    
    async def get(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """获取缓存数据"""
        cache_key = self._generate_cache_key(data)
        
        # 1. 先查软缓存
        if cache_key in self.soft_cache:
            # 移动到末尾（LRU）
            value = self.soft_cache.pop(cache_key)
            self.soft_cache[cache_key] = value
            print(f"🎯 软缓存命中: {cache_key[:8]}...")
            return value
        
        # 2. 再查硬缓存
        if self.redis_client:
            try:
                cached_data = await self.redis_client.get(cache_key)
                if cached_data:
                    result = json.loads(cached_data)
                    # 放入软缓存
                    await self._add_to_soft_cache(cache_key, result)
                    print(f"💾 硬缓存命中: {cache_key[:8]}...")
                    return result
            except Exception as e:
                print(f"⚠️ Redis查询失败: {e}")
        
        print(f"❌ 缓存未命中: {cache_key[:8]}...")
        return None
    
    async def set(self, data: Dict[str, Any], result: Dict[str, Any]):
        """设置缓存数据"""
        cache_key = self._generate_cache_key(data)
        
        # 1. 设置软缓存
        await self._add_to_soft_cache(cache_key, result)
        
        # 2. 设置硬缓存
        if self.redis_client:
            try:
                await self.redis_client.setex(
                    cache_key,
                    settings.HARD_CACHE_TTL,
                    json.dumps(result, ensure_ascii=False)
                )
                print(f"💾 硬缓存已设置: {cache_key[:8]}...")
            except Exception as e:
                print(f"⚠️ Redis设置失败: {e}")
    
    async def _add_to_soft_cache(self, key: str, value: Dict[str, Any]):
        """添加到软缓存（LRU策略）"""
        if key in self.soft_cache:
            self.soft_cache.pop(key)
        elif len(self.soft_cache) >= self.max_soft_cache_size:
            # 移除最旧的项
            self.soft_cache.popitem(last=False)
        
        self.soft_cache[key] = value
        print(f"🎯 软缓存已设置: {key[:8]}...")
    
    async def clear_soft_cache(self):
        """清空软缓存"""
        self.soft_cache.clear()
        print("🧹 软缓存已清空")
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        stats = {
            "soft_cache_size": len(self.soft_cache),
            "soft_cache_max_size": self.max_soft_cache_size,
            "redis_connected": self.redis_client is not None
        }
        
        if self.redis_client:
            try:
                info = await self.redis_client.info()
                stats["redis_info"] = {
                    "used_memory": info.get("used_memory_human", "N/A"),
                    "connected_clients": info.get("connected_clients", "N/A"),
                    "total_commands_processed": info.get("total_commands_processed", "N/A")
                }
            except Exception as e:
                stats["redis_error"] = str(e)
        
        return stats

# 全局缓存实例
dual_cache = DualCache()

async def init_cache():
    """初始化缓存系统"""
    await dual_cache.init_redis()
