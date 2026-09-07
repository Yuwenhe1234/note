/**
 * [L3 能力插件层] LearningAssistantPlugin - 新任务学习辅助
 * 意图：task.learning
 * 能力：知识领域定位 / 学习视频方向推荐 / 核心精简笔记生成
 */

class LearningAssistantPlugin extends BasePlugin {
    constructor() {
        super({
            name: 'learning-assistant',
            version: '1.0.0',
            description: '学习资源推荐与核心笔记',
            intents: ['task.learning']
        });
    }

    /* ===== 领域知识库 ===== */
    static DOMAINS = {
        react: {
            keywords: ['react', 'hooks', 'jsx', 'redux', 'next.js', '组件'],
            resources: [
                { position: '入门讲解', direction: 'React 官方文档与交互式教程', content: '组件化思想、JSX 语法、State 与 Props 基础' },
                { position: '实操教程', direction: 'React 实战项目教程', content: 'Hooks 实战、状态管理、路由方案演练' },
                { position: '进阶提升', direction: '深入 React 原理与性能优化', content: 'Fiber 架构、并发渲染、性能调优' }
            ],
            notes: '核心概念：组件化开发、单向数据流、Hooks 函数式编程\n关键步骤：1.拆分组件 2.管理状态 3.处理副作用 4.性能优化\n避坑提示：1.State 异步更新 2.key 要稳定唯一 3.effect 依赖要写全'
        },
        vue: {
            keywords: ['vue', 'vuex', 'pinia', 'vue3', 'composition'],
            resources: [
                { position: '入门讲解', direction: 'Vue 官方文档基础教程', content: '模板语法、响应式数据、组件通信基础' },
                { position: '实操教程', direction: 'Vue3 实战项目搭建', content: 'Composition API、Pinia 状态管理、Vite 构建' },
                { position: '进阶提升', direction: 'Vue 源码与生态进阶', content: '响应式原理、自定义渲染器、SSR 方案' }
            ],
            notes: '核心概念：响应式数据、组件化、单文件组件\n关键步骤：1.定义响应数据 2.编写模板 3.组件通信 4.状态管理\n避坑提示：1.ref 要 .value 2.reactive 避免解构丢失响应 3.v-for 要绑 key'
        },
        python: {
            keywords: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', '爬虫'],
            resources: [
                { position: '入门讲解', direction: 'Python 基础语法教程', content: '数据类型、控制流、函数、面向对象基础' },
                { position: '实操教程', direction: 'Python 实战项目教程', content: 'Web 框架实战、数据分析、自动化脚本' },
                { position: '进阶提升', direction: 'Python 高级特性与性能', content: '装饰器、生成器、异步编程、性能优化' }
            ],
            notes: '核心概念：动态类型、面向对象、迭代器/生成器\n关键步骤：1.环境搭建 2.基础语法 3.模块化组织 4.框架应用\n避坑提示：1.可变默认参数陷阱 2.浅拷贝 vs 深拷贝 3.GIL 对多线程影响'
        },
        javascript: {
            keywords: ['javascript', 'js', 'es6', 'typescript', 'ts', 'node', 'promise', '异步'],
            resources: [
                { position: '入门讲解', direction: 'MDN JavaScript 教程', content: '变量作用域、数据类型、函数与闭包' },
                { position: '实操教程', direction: '现代 JS 实战开发', content: 'ES6+ 语法、异步编程、模块化开发' },
                { position: '进阶提升', direction: 'JS 高级原理与设计模式', content: '事件循环、原型链、设计模式、性能优化' }
            ],
            notes: '核心概念：原型链、闭包、事件循环、异步编程\n关键步骤：1.掌握语法 2.理解作用域 3.异步编程 4.模块化\n避坑提示：1.var 变量提升 2.this 指向问题 3.异步不是同步等待'
        },
        database: {
            keywords: ['sql', '数据库', 'mysql', 'postgres', 'redis', 'mongodb', '索引'],
            resources: [
                { position: '入门讲解', direction: 'SQL 基础与数据库原理', content: '增删改查、表设计、关系模型' },
                { position: '实操教程', direction: '数据库实战与性能调优', content: '索引优化、查询计划分析、事务隔离' },
                { position: '进阶提升', direction: '数据库架构与分布式', content: '分库分表、读写分离、高可用架构' }
            ],
            notes: '核心概念：关系模型、ACID 事务、索引原理、查询优化\n关键步骤：1.表结构设计 2.编写 SQL 3.索引优化 4.事务处理\n避坑提示：1.避免 SELECT * 2.索引不是越多越好 3.大事务影响并发'
        },
        devops: {
            keywords: ['docker', 'kubernetes', 'k8s', 'ci/cd', 'jenkins', '运维', '部署', 'nginx', 'linux'],
            resources: [
                { position: '入门讲解', direction: 'DevOps 基础与容器化入门', content: 'Docker 基础、镜像与容器、Linux 命令' },
                { position: '实操教程', direction: 'CI/CD 流水线实战', content: 'Actions/Jenkins 配置、K8s 部署' },
                { position: '进阶提升', direction: '云原生架构与可观测性', content: '服务网格、监控告警、日志收集' }
            ],
            notes: '核心概念：容器化、CI/CD、基础设施即代码\n关键步骤：1.Docker 化应用 2.配置 CI/CD 3.容器编排 4.监控告警\n避坑提示：1.镜像分层缓存 2.配置与密钥分离 3.资源限制别忘了设'
        },
        general: {
            keywords: [],
            resources: [
                { position: '入门讲解', direction: '搜索相关领域入门教程', content: '基础概念与核心知识点入门' },
                { position: '实操教程', direction: '查找实战案例与项目教程', content: '动手实践与操作流程演练' },
                { position: '进阶提升', direction: '深入该领域高级专题', content: '进阶原理、最佳实践与前沿趋势' }
            ],
            notes: '核心概念：围绕学习目标梳理 3-5 个关键概念\n关键步骤：1.建立知识框架 2.理解核心原理 3.动手实践 4.总结复盘\n避坑提示：1.不要只看不练 2.先搭框架再填细节 3.按遗忘曲线复习'
        }
    };

    execute(payload) {
        const text = `${payload.title || ''} ${payload.description || ''}`.toLowerCase();

        let domain = LearningAssistantPlugin.DOMAINS.general;
        for (const [key, data] of Object.entries(LearningAssistantPlugin.DOMAINS)) {
            if (key === 'general') continue;
            if (data.keywords.some(kw => text.includes(kw))) {
                domain = data;
                break;
            }
        }

        Logger.debug(`[learning-assistant] 匹配领域: ${domain === LearningAssistantPlugin.DOMAINS.general ? '通用' : '已命中'}`);

        return {
            video_recommendations: Utils.deepClone(domain.resources),
            core_notes: domain.notes
        };
    }
}
