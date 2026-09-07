/**
 * [L1 交互接入层] WebAdapter - Web 端接入适配器（Apple 风格 v3.0）
 * 职责：接收用户操作 → 转换为意图分发给 Agent（L2）→ 渲染返回结果
 * 全部数据操作经 Agent.dispatch 走插件链路，UI 层零直接数据访问
 * 新增接入端（客户端/小程序）仅需仿照本适配器实现相同协议
 */

const WebAdapter = (function () {

    let _currentView = 'taskList';
    let _currentTaskId = null;
    let _analysisDraft = null;
    let _messages = [];          // 今日消息骨架的内存 Feed
    let _companionOn = false;   // AI 陪伴启停状态
    let _stageTimer = null;

    /* ========== 视图映射 ========== */
    const VIEW_MAP = {
        taskList:     'view-taskList',
        todayTasks:   'view-todayTasks',
        more:         'view-more',
        taskDetail:   'view-taskDetail',
        chat:         'view-chat',
        companion:    'view-companion',
        messages:     'view-messages',
        architecture: 'view-architecture',
        settings:     'view-settings'
    };

    function switchView(viewName) {
        _currentView = viewName in VIEW_MAP ? viewName : 'taskList';

        document.querySelectorAll('.nav-item').forEach(item =>
            item.classList.toggle('active', item.dataset.view === _currentView));

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(VIEW_MAP[_currentView]);
        if (target) target.classList.add('active');

        // 滚动到顶部并触发滚动揭示
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderCurrent();
        requestAnimationFrame(_observeReveals);
        _closeMobileNav();
    }

    function renderCurrent() {
        switch (_currentView) {
            case 'taskList':      renderTaskList();      break;
            case 'todayTasks':    renderTodayView();     break;
            case 'companion':     renderCompanion();     break;
            case 'messages':      renderMessages();      break;
            case 'architecture':  renderArchitecture();  break;
            case 'settings':      renderSettings();      break;
            case 'taskDetail':    renderTaskDetail(_currentTaskId); break;
            case 'chat':          break; // 由 ChatAdapter 管理
            case 'more':          break; // 静态 Grid，无需渲染
        }
    }

    /* ========== 滚动揭示（IntersectionObserver） ========== */
    let _io = null;
    function _observeReveals() {
        if (!_io) {
            _io = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('visible');
                        _io.unobserve(e.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        }
        const view = document.querySelector('.view.active');
        if (!view) return;
        view.querySelectorAll('.reveal:not(.visible)').forEach(el => _io.observe(el));
        // 首屏直接可见
        setTimeout(() => view.querySelectorAll('.reveal:not(.visible)').forEach(el => el.classList.add('visible')), 60);
    }

    /* ========== 任务清单 ========== */
    function _collectFilters() {
        return {
            type:     Utils.el('filterType').value,
            status:   Utils.el('filterStatus').value,
            priority: Utils.el('filterPriority').value,
            search:   Utils.el('searchInput').value
        };
    }

    function _updateQuickStats() {
        const stats = Agent.dispatch('stats.get', {});
        Utils.el('qTotal').textContent = stats.total;
        Utils.el('qInProgress').textContent = stats.in_progress;
        Utils.el('qCompleted').textContent = stats.completed;
        Utils.el('qOverdue').textContent = stats.overdue;
        Utils.el('taskCountBadge').textContent = Agent.dispatch('task.query', { filters: {}, sortBy: null }).length;
    }

    function renderTaskList() {
        _updateQuickStats();
        const tasks = Agent.dispatch('task.query', { filters: _collectFilters(), sortBy: Utils.el('sortBy').value }) || [];
        const grid = Utils.el('taskGrid');
        grid.innerHTML = tasks.length === 0
            ? `<div class="empty-state"><span class="empty-icon">&#128203;</span><p>暂无符合条件的任务，点击「新建任务」开始</p></div>`
            : tasks.map(renderTaskCard).join('');
        requestAnimationFrame(_observeReveals);
    }

    function renderTaskCard(t) {
        const days = Utils.daysUntil(t.deadline);
        const od = Utils.isOverdue(t);
        const done = t.status === 'completed';
        const deadlineText = t.deadline
            ? (od ? `逾期 ${Math.abs(days)} 天` : (days === 0 ? '今天截止' : `${days} 天后截止`))
            : '无截止时间';
        const subDone = t.subtasks.filter(s => s.done).length;

        return `
            <div class="task-card priority-${t.priority} ${done ? 'completed' : ''}" data-task-id="${t.task_id}" data-action="view">
                <div class="task-card-header">
                    <div class="task-check ${done ? 'checked' : ''}" data-action="toggle" data-id="${t.task_id}"></div>
                    <span class="task-card-title">${Utils.escape(t.title)}</span>
                    <span class="task-tag tag-priority-${t.priority}">${Schema.PRIORITY_LABELS[t.priority]}</span>
                </div>
                <div class="task-card-meta">
                    <span class="task-tag tag-type-${t.type}">${Schema.TYPE_LABELS[t.type]}</span>
                    <span class="task-tag tag-status-${t.status}">${Schema.STATUS_LABELS[t.status]}</span>
                    ${t.description ? `<span style="font-size:13px;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px;">${Utils.escape(t.description)}</span>` : ''}
                </div>
                <div class="task-card-info">
                    <span class="task-card-duration">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${Utils.formatDuration(t.total_duration)}
                    </span>
                    <span class="task-card-deadline ${od ? 'overdue' : ''}">${deadlineText}</span>
                </div>
                ${t.subtasks.length > 0 ? `<div class="task-card-subtasks">子任务 ${subDone}/${t.subtasks.length} 完成 · 进度 ${t.progress}%</div>` : ''}
            </div>`;
    }

    /* ========== 今日待办（Timeline + 轻量风险） ========== */
    function renderTodayView() {
        Utils.el('todayViewDate').textContent = Utils.todayLabel();
        const overdue = Agent.dispatch('task.getOverdue', {}) || [];
        const today = Agent.dispatch('task.getToday', {}) || [];
        const all = [...overdue, ...today];
        const list = Utils.el('todayFullList');

        list.innerHTML = all.length === 0
            ? `<div class="empty-state"><span class="empty-icon">&#127774;</span><p>今天没有待办任务，休息一下吧</p></div>`
            : all.map(t => {
                const isOd = overdue.includes(t);
                const days = Utils.daysUntil(t.deadline);
                const done = t.status === 'completed';
                const subDone = t.subtasks.filter(s => s.done).length;
                const riskHint = t.risk_reminder && t.risk_reminder.length > 0
                    ? `<div style="margin-top:10px;font-size:12px;color:#B0650A;background:var(--warning-soft);padding:6px 12px;border-radius:8px;display:inline-block;">&#9888; ${Utils.escape(t.risk_reminder[0].problem)}</div>`
                    : '';
                return `
                    <div class="task-card priority-${t.priority} status-${t.status}" data-task-id="${t.task_id}" data-action="view">
                        <div class="task-card-header">
                            <div class="task-check ${done ? 'checked' : ''}" data-action="toggle" data-id="${t.task_id}"></div>
                            <span class="task-card-title">${Utils.escape(t.title)}</span>
                            <span class="task-tag tag-priority-${t.priority}">${Schema.PRIORITY_LABELS[t.priority]}</span>
                        </div>
                        <div class="task-card-meta">
                            <span class="task-tag tag-type-${t.type}">${Schema.TYPE_LABELS[t.type]}</span>
                            <span class="task-card-deadline ${isOd ? 'overdue' : ''}">
                                ${isOd ? `逾期 ${Math.abs(days)} 天` : (days === 0 ? '今天截止' : `${days}天后截止`)}
                            </span>
                        </div>
                        ${t.subtasks.length > 0 ? `
                            <div class="progress-container">
                                <div class="progress-track"><div class="progress-fill" style="width:${t.progress}%"></div></div>
                                <div class="progress-label"><span>子任务 ${subDone}/${t.subtasks.length}</span><span>${t.progress}%</span></div>
                            </div>` : ''}
                        ${riskHint}
                    </div>`;
            }).join('');
        requestAnimationFrame(_observeReveals);
    }

    /* ========== AI 陪伴（骨架） ========== */
    function renderCompanion() {
        const c = Utils.el('companionContent');
        c.innerHTML = `
            <div class="companion-stage reveal">
                <div class="companion-avatar ${_companionOn ? 'active' : ''}" id="cpAvatar">
                    <span class="companion-avatar-ring"></span>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/></svg>
                </div>
                <div class="companion-status" id="cpStatus">${_companionOn ? '陪伴中…' : '已暂停'}</div>
                <div class="companion-hint">极简陪伴，专注当下。可切换状态与动作。</div>
                <div class="companion-controls">
                    <div class="companion-row">
                        <span class="companion-row-label">声音陪伴</span>
                        <div class="toggle ${_companionOn ? 'on' : ''}" id="cpToggle"></div>
                    </div>
                    <div class="companion-row">
                        <span class="companion-row-label">动作</span>
                        <div style="display:flex;gap:6px;">
                            <button class="btn-ghost cp-action" data-action="focus" style="padding:5px 12px;font-size:13px;">专注</button>
                            <button class="btn-ghost cp-action" data-action="rest" style="padding:5px 12px;font-size:13px;">休息</button>
                            <button class="btn-ghost cp-action" data-action="cheer" style="padding:5px 12px;font-size:13px;">鼓励</button>
                        </div>
                    </div>
                    <button class="btn-primary" id="cpStartBtn" style="justify-content:center;">${_companionOn ? '停止陪伴' : '开始陪伴'}</button>
                </div>
            </div>`;
        requestAnimationFrame(_observeReveals);
    }

    function _bindCompanion() {
        const root = Utils.el('companionContent');
        if (!root) return;
        root.querySelector('#cpStartBtn')?.addEventListener('click', () => {
            _companionOn = !_companionOn;
            renderCompanion();
        });
        root.querySelector('#cpToggle')?.addEventListener('click', () => {
            _companionOn = !_companionOn;
            renderCompanion();
        });
        root.querySelectorAll('.cp-action').forEach(btn => btn.addEventListener('click', () => {
            const map = { focus: '专注模式，开始吧', rest: '休息一下，别急', cheer: '加油，你能做到' };
            const st = Utils.el('cpStatus');
            if (st) st.textContent = map[btn.dataset.action] || '';
            if (!_companionOn) { _companionOn = true; renderCompanion(); }
        }));
    }

    /* ========== 今日消息（骨架） ========== */
    function renderMessages() {
        const c = Utils.el('messagesContent');
        c.innerHTML = `
            <div class="reveal">
                <div class="messages-input-bar">
                    <input type="text" class="messages-input" id="msgInput" placeholder="粘贴链接，回车或点刷新加入 Feed">
                    <button class="btn-primary" id="msgAddBtn">刷新</button>
                </div>
                <div class="message-feed" id="msgFeed"></div>
            </div>`;
        _renderMessageFeed();
        requestAnimationFrame(_observeReveals);

        const input = Utils.el('msgInput');
        Utils.el('msgAddBtn')?.addEventListener('click', () => _addMessage(input.value));
        input?.addEventListener('keydown', e => { if (e.key === 'Enter') _addMessage(input.value); });
    }

    function _addMessage(val) {
        val = (val || '').trim();
        if (!val) { WebAdapter.toast('请输入链接', 'warning'); return; }
        _messages.unshift({ url: val, time: new Date() });
        Utils.el('msgInput').value = '';
        _renderMessageFeed();
        WebAdapter.toast('已加入 Feed', 'success');
    }

    function _renderMessageFeed() {
        const feed = Utils.el('msgFeed');
        if (!feed) return;
        feed.innerHTML = _messages.length === 0
            ? `<div class="empty-state"><span class="empty-icon">&#128240;</span><p>暂无消息，粘贴链接开始聚合</p></div>`
            : _messages.map(m => `
                <div class="message-card">
                    <div class="message-card-title">${Utils.escape(m.url)}</div>
                    <div class="message-card-meta">${Utils.formatDate(m.time)}</div>
                </div>`).join('');
    }

    /* ========== 任务详情 ========== */
    function renderTaskDetail(taskId) {
        const task = Agent.dispatch('task.get', { id: taskId });
        const container = Utils.el('taskDetailContent');
        if (!task) { container.innerHTML = '<div class="empty-state"><p>任务不存在</p></div>'; return; }

        const od = Utils.isOverdue(task);
        container.innerHTML = `
            <div class="detail-container reveal">
                <div class="detail-overview">
                    <div class="detail-overview-header">
                        <h1 class="detail-title">${Utils.escape(task.title)}</h1>
                        <div class="detail-actions">
                            <button class="btn-secondary" data-action="edit" data-id="${task.task_id}">编辑</button>
                            <button class="btn-danger" data-action="delete" data-id="${task.task_id}">删除</button>
                        </div>
                    </div>
                    <div class="detail-tags">
                        <span class="task-tag tag-type-${task.type}">${Schema.TYPE_LABELS[task.type]}</span>
                        <span class="task-tag tag-status-${task.status}">${Schema.STATUS_LABELS[task.status]}</span>
                        <span class="task-tag tag-priority-${task.priority}">${Schema.PRIORITY_LABELS[task.priority]}</span>
                    </div>
                    ${task.description ? `<div class="detail-description">${Utils.escape(task.description)}</div>` : ''}
                    <div class="detail-meta">
                        <div class="detail-meta-item"><span class="detail-meta-label">总预估时长</span><span class="detail-meta-value">${Utils.formatDuration(task.total_duration)}</span></div>
                        <div class="detail-meta-item"><span class="detail-meta-label">截止时间</span><span class="detail-meta-value ${od ? 'overdue' : ''}">${Utils.formatDate(task.deadline)}</span></div>
                        <div class="detail-meta-item"><span class="detail-meta-label">完成进度</span><span class="detail-meta-value">${task.progress}%</span></div>
                        <div class="detail-meta-item">
                            <span class="detail-meta-label">状态</span>
                            <select class="form-select" data-action="status-change" data-id="${task.task_id}" style="width:auto;">
                                ${Schema.TASK_STATUSES.map(s => `<option value="${s}" ${task.status === s ? 'selected' : ''}>${Schema.STATUS_LABELS[s]}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-track"><div class="progress-fill" style="width:${task.progress}%"></div></div>
                    </div>
                </div>

                ${task.subtasks.length > 0 ? `
                <div class="detail-section">
                    <div class="detail-section-header"><span class="detail-section-icon">&#128203;</span><h3>任务拆解与时长分配</h3></div>
                    <div class="subtask-list">
                        ${task.subtasks.map((s, i) => `
                            <div class="subtask-item">
                                <div class="today-task-checkbox ${s.done ? 'checked' : ''}" data-action="toggle-subtask" data-id="${task.task_id}" data-index="${i}"></div>
                                <span class="subtask-order">${s.order}</span>
                                <span class="subtask-name" style="${s.done ? 'text-decoration:line-through;color:var(--text-tertiary)' : ''}">${Utils.escape(s.name)}</span>
                                <span class="subtask-duration">${Utils.formatDuration(s.duration)}</span>
                            </div>`).join('')}
                    </div>
                </div>` : ''}

                ${task.learning_support ? `
                <div class="detail-section">
                    <div class="detail-section-header"><span class="detail-section-icon">&#128218;</span><h3>学习辅助</h3></div>
                    <div class="learning-section">
                        <div class="learning-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>推荐学习资源</div>
                        <div class="learning-resources">
                            ${task.learning_support.video_recommendations.map(r => `
                                <div class="learning-resource-item">
                                    <div class="learning-resource-position">【${r.position}】${Utils.escape(r.direction)}</div>
                                    <div class="learning-resource-content">核心覆盖：${Utils.escape(r.content)}</div>
                                </div>`).join('')}
                        </div>
                    </div>
                    <div class="learning-section">
                        <div class="learning-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>核心精简笔记</div>
                        <div class="core-notes">${Utils.escape(task.learning_support.core_notes)}</div>
                    </div>
                </div>` : ''}

                ${task.risk_reminder.length > 0 ? `
                <div class="detail-section">
                    <div class="detail-section-header"><span class="detail-section-icon">&#9888;&#65039;</span><h3>风险提示与应对</h3></div>
                    <div class="risk-list">
                        ${task.risk_reminder.map(r => `
                            <div class="risk-item">
                                <span class="risk-icon">&#9888;</span>
                                <div class="risk-content">
                                    <div class="risk-problem">${Utils.escape(r.problem)}</div>
                                    <div class="risk-solution">${Utils.escape(r.solution)}</div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>` : ''}
            </div>`;
        requestAnimationFrame(_observeReveals);
    }

    /* ========== 架构面板 ========== */
    function renderArchitecture() {
        const plugins = Agent.listPlugins();
        Utils.el('architectureContent').innerHTML = `
            <div class="settings-container reveal">
                <div class="settings-card">
                    <h3>五层架构总览</h3>
                    <div style="font-size:14px;color:var(--text-secondary);line-height:2;">
                        <strong>L1 交互接入层</strong> — WebAdapter + ChatAdapter，新增端仅需适配接入协议<br>
                        <strong>L2 Agent 调度核心层</strong> — IntentRouter · PluginRegistry · MemoryManager · Agent 编排<br>
                        <strong>L3 能力插件层</strong> — 已注册 ${plugins.length} 个插件，新增功能 = 新增插件<br>
                        <strong>L4 数据持久层</strong> — Schema 范式 · TaskRepository · UserRepository<br>
                        <strong>L5 基础能力层</strong> — EventBus · Logger · Utils · StorageDriver
                    </div>
                </div>
                <div class="settings-card">
                    <h3>已注册插件（${plugins.length}）</h3>
                    <div class="type-distribution">
                        ${plugins.map(p => `
                            <div class="type-dist-item">
                                <span class="type-dist-dot" style="background:${p.enabled ? '#34C759' : '#AEAEB2'}"></span>
                                <span class="type-dist-label"><strong>${p.name}</strong> v${p.version} — ${p.description}</span>
                                <span class="type-dist-value">${p.intents.length} 意图</span>
                            </div>`).join('')}
                    </div>
                </div>
                <div class="settings-card">
                    <h3>事件总线</h3>
                    <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;">
                        task:created · task:updated · task:deleted · plugin:registered · agent:replied 实时广播，
                        任意层可订阅响应，实现层间解耦。
                    </div>
                </div>
            </div>`;
        requestAnimationFrame(_observeReveals);
    }

    /* ========== 设置 ========== */
    function renderSettings() {
        const settings = UserRepository.get();
        const stats = Agent.dispatch('stats.get', {});

        Utils.el('settingsContainer').innerHTML = `
            <div class="reveal">
                <div class="settings-card">
                    <h3>外观</h3>
                    <div class="settings-options">
                        <div class="settings-option">
                            <div class="settings-option-label">
                                <div class="settings-option-title">主题</div>
                                <div class="settings-option-desc">当前为浅色（Apple 风格）</div>
                            </div>
                            <select class="form-select" disabled><option>浅色</option></select>
                        </div>
                    </div>
                </div>
                <div class="settings-card">
                    <h3>AI</h3>
                    <div class="settings-options">
                        <div class="settings-option">
                            <div class="settings-option-label">
                                <div class="settings-option-title">执行节奏</div>
                                <div class="settings-option-desc">影响时长预估的调整系数</div>
                            </div>
                            <select class="form-select" data-setting="pace">
                                <option value="slow" ${settings.pace === 'slow' ? 'selected' : ''}>慢节奏（+30%）</option>
                                <option value="medium" ${settings.pace === 'medium' ? 'selected' : ''}>标准节奏</option>
                                <option value="fast" ${settings.pace === 'fast' ? 'selected' : ''}>快节奏（-25%）</option>
                            </select>
                        </div>
                        <div class="settings-option">
                            <div class="settings-option-label">
                                <div class="settings-option-title">熟练程度</div>
                                <div class="settings-option-desc">影响时长预估的调整系数</div>
                            </div>
                            <select class="form-select" data-setting="proficiency">
                                <option value="beginner" ${settings.proficiency === 'beginner' ? 'selected' : ''}>初学者（+30%）</option>
                                <option value="medium" ${settings.proficiency === 'medium' ? 'selected' : ''}>中等熟练</option>
                                <option value="expert" ${settings.proficiency === 'expert' ? 'selected' : ''}>专家级（-30%）</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="settings-card">
                    <h3>Agent</h3>
                    <div class="settings-options">
                        <div class="settings-option">
                            <div class="settings-option-label">
                                <div class="settings-option-title">已注册插件</div>
                                <div class="settings-option-desc">见「Agent」页查看运行时状态</div>
                            </div>
                            <button class="btn-secondary" data-jump="architecture">查看</button>
                        </div>
                    </div>
                </div>
                <div class="settings-card">
                    <h3>通知</h3>
                    <div class="settings-options">
                        <div class="settings-option">
                            <div class="settings-option-label">
                                <div class="settings-option-title">截止提醒</div>
                                <div class="settings-option-desc">今日待办与逾期任务提示</div>
                            </div>
                            <div class="toggle on" id="notifyToggle"></div>
                        </div>
                    </div>
                </div>
                <div class="settings-card">
                    <h3>数据</h3>
                    <div class="settings-actions">
                        <button class="btn-primary" id="btnExportData">导出数据</button>
                        <button class="btn-secondary" id="btnImportData">导入数据</button>
                        <button class="btn-secondary" id="btnLoadSample">加载示例数据</button>
                        <button class="btn-danger" id="btnClearAll">清空所有任务</button>
                    </div>
                    <input type="file" id="importFileInput" accept=".json" style="display:none;">
                    <div style="font-size:13px;color:var(--text-tertiary);margin-top:14px;line-height:1.8;">
                        总任务 ${stats.total} 条 · 已完成 ${stats.completed} · 进行中 ${stats.in_progress}<br>
                        累计预估时长 ${Utils.formatDuration(stats.totalDuration)}<br>
                        数据存储于本地浏览器，不会上传至服务器
                    </div>
                </div>
            </div>`;

        _bindSettingsEvents(settings);
        requestAnimationFrame(_observeReveals);
    }

    function _bindSettingsEvents() {
        document.querySelectorAll('[data-setting]').forEach(select => {
            select.addEventListener('change', () => {
                UserRepository.save({ [select.dataset.setting]: select.value });
                WebAdapter.toast('设置已保存', 'success');
            });
        });
        document.querySelector('[data-jump="architecture"]')?.addEventListener('click', () => switchView('architecture'));
        Utils.el('notifyToggle')?.addEventListener('click', e => e.target.classList.toggle('on'));

        Utils.el('btnExportData')?.addEventListener('click', () => {
            const data = TaskRepository.exportAll();
            data.settings = UserRepository.get();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `tasks_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
            URL.revokeObjectURL(url);
            WebAdapter.toast('数据已导出', 'success');
        });
        const fileInput = Utils.el('importFileInput');
        Utils.el('btnImportData')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const data = JSON.parse(await file.text());
                if (TaskRepository.importAll(data)) {
                    if (data.settings) UserRepository.save(data.settings);
                    WebAdapter.toast('数据导入成功', 'success');
                    renderCurrent();
                } else WebAdapter.toast('文件格式不正确', 'error');
            } catch (err) { WebAdapter.toast('导入失败：' + err.message, 'error'); }
            fileInput.value = '';
        });
        Utils.el('btnLoadSample')?.addEventListener('click', async () => {
            if (await WebAdapter.confirm('加载示例数据将追加到现有任务中，是否继续？')) {
                TaskRepository.seedIfEmpty();
                WebAdapter.toast('示例数据已加载', 'success');
                renderCurrent();
            }
        });
        Utils.el('btnClearAll')?.addEventListener('click', async () => {
            if (await WebAdapter.confirm('确定要清空所有任务吗？此操作不可撤销，建议先导出备份！')) {
                TaskRepository.clearAll();
                WebAdapter.toast('所有任务已清空', 'success');
                renderCurrent();
            }
        });
    }

    /* ========== 任务模态框 + AI 分析阶段 ========== */
    function openTaskModal(taskId) {
        _currentTaskId = taskId || null;
        _analysisDraft = null;
        const isEdit = !!taskId;
        const task = isEdit ? Agent.dispatch('task.get', { id: taskId }) : null;

        Utils.el('modalTitle').textContent = isEdit ? '编辑任务' : '新建任务';
        Utils.el('modalBody').innerHTML = `
            <div class="form-group">
                <label class="form-label">任务标题 <span class="required">*</span></label>
                <input type="text" class="form-input" id="inputTitle" placeholder="请输入任务标题" value="${task ? Utils.escape(task.title) : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">任务描述</label>
                <textarea class="form-textarea" id="inputDescription" placeholder="描述任务背景、目标、细节">${task ? Utils.escape(task.description) : ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">任务类型</label>
                    <select class="form-select" id="inputType">
                        <option value="auto">智能识别</option>
                        ${Schema.TASK_TYPES.map(t => `<option value="${t}" ${task && task.type === t ? 'selected' : ''}>${Schema.TYPE_LABELS[t]}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">优先级</label>
                    <select class="form-select" id="inputPriority">
                        <option value="auto">智能判定</option>
                        ${Schema.TASK_PRIORITIES.map(p => `<option value="${p}" ${task && task.priority === p ? 'selected' : ''}>${Schema.PRIORITY_LABELS[p]}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">截止时间</label>
                <input type="datetime-local" class="form-input" id="inputDeadline" value="${task && task.deadline ? task.deadline : ''}">
                <p class="form-hint">设置截止时间后，系统将根据紧急程度自动判定优先级</p>
            </div>
            <div class="analysis-result" id="analysisResult">
                <div class="analysis-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    智能分析结果（任务分析 → 学习辅助 → 风险预警 编排链）
                </div>
                <div id="analysisContent"></div>
            </div>`;

        if (isEdit && task) {
            _analysisDraft = Utils.deepClone(task);
            Utils.el('analysisResult').classList.add('active');
            Utils.el('analysisContent').innerHTML = _renderDraftPreview(_analysisDraft);
        }
        Utils.el('taskModal').classList.add('active');
    }

    function closeTaskModal() {
        Utils.el('taskModal').classList.remove('active');
        Utils.el('analysisStages').hidden = true;
        _resetStages();
        _currentTaskId = null;
        _analysisDraft = null;
    }

    const STAGE_ORDER = ['understand', 'breakdown', 'estimate', 'resource', 'risk'];
    function _resetStages() {
        document.querySelectorAll('.stage').forEach(s => s.classList.remove('active', 'done'));
    }
    function _setStage(name, state) {
        const el = document.querySelector(`.stage[data-stage="${name}"]`);
        if (el) { el.classList.remove('active', 'done'); if (state) el.classList.add(state); }
    }
    function _runStages(done) {
        _resetStages();
        Utils.el('analysisStages').hidden = false;
        let i = 0;
        if (_stageTimer) clearInterval(_stageTimer);
        _stageTimer = setInterval(() => {
            if (i > 0) _setStage(STAGE_ORDER[i - 1], 'done');
            if (i < STAGE_ORDER.length) {
                _setStage(STAGE_ORDER[i], 'active');
                i++;
            } else {
                clearInterval(_stageTimer);
                _stageTimer = null;
                if (done) done();
            }
        }, 180);
    }

    function runAnalysis() {
        const title = Utils.el('inputTitle').value.trim();
        if (!title) { WebAdapter.toast('请先输入任务标题', 'warning'); Utils.el('inputTitle').focus(); return; }

        Utils.el('analysisResult').classList.add('active');
        Utils.el('analysisContent').innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:12px;color:var(--accent);"><span class="loading-dots"><span></span><span></span><span></span></span> 正在编排任务分析链路…</div>`;

        _runStages(() => {
            _analysisDraft = Agent.analyzeTaskFull({
                title,
                description: Utils.el('inputDescription').value.trim(),
                type: Utils.el('inputType').value,
                priority: Utils.el('inputPriority').value,
                deadline: Utils.el('inputDeadline').value
            });
            setTimeout(() => {
                STAGE_ORDER.forEach(s => _setStage(s, 'done'));
                Utils.el('analysisStages').hidden = true;
            }, 200);
            Utils.el('analysisContent').innerHTML = _renderDraftPreview(_analysisDraft);
            WebAdapter.toast('编排完成', 'success');
        });
    }

    function _renderDraftPreview(draft) {
        let html = `
            <div style="margin-bottom:12px;">
                <span style="font-size:13px;color:var(--text-secondary);">识别类型：</span>
                <span class="task-tag tag-type-${draft.type}">${Schema.TYPE_LABELS[draft.type]}</span>
                <span style="font-size:13px;color:var(--text-secondary);margin-left:8px;">优先级：</span>
                <span class="task-tag tag-priority-${draft.priority}">${Schema.PRIORITY_LABELS[draft.priority]}</span>
            </div>
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">子任务拆解（共 ${draft.subtasks.length} 项 · 总时长 ${Utils.formatDuration(draft.total_duration)}）</div>
            ${draft.subtasks.map(s => `
                <div class="analysis-subtask">
                    <span style="color:var(--accent);font-weight:600;">${s.order}.</span>
                    <input type="text" value="${Utils.escape(s.name)}" data-field="subtask-name" data-order="${s.order}">
                    <input type="number" value="${s.duration}" data-field="subtask-duration" data-order="${s.order}" min="5" step="5">
                    <span style="font-size:12px;color:var(--text-tertiary);">分钟</span>
                </div>`).join('')}`;
        if (draft.learning_support) html += `<div style="font-size:13px;font-weight:600;margin:12px 0 6px;">学习辅助已生成</div><div style="font-size:12px;color:var(--text-secondary);">${draft.learning_support.video_recommendations.length} 条资源 · 核心笔记已生成</div>`;
        if (draft.risk_reminder.length > 0) html += `<div style="font-size:13px;font-weight:600;margin:12px 0 6px;">风险预警</div>` + draft.risk_reminder.map(r => `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;"><span style="color:var(--warning);">&#9888;</span> ${Utils.escape(r.problem)}</div>`).join('');
        return html;
    }

    function saveTask() {
        const title = Utils.el('inputTitle').value.trim();
        if (!title) { WebAdapter.toast('请输入任务标题', 'error'); return; }
        if (!_analysisDraft) {
            _analysisDraft = Agent.analyzeTaskFull({
                title,
                description: Utils.el('inputDescription').value.trim(),
                type: Utils.el('inputType').value,
                priority: Utils.el('inputPriority').value,
                deadline: Utils.el('inputDeadline').value
            });
        }
        let subtasks = _analysisDraft.subtasks.map(s => {
            const nameInput = document.querySelector(`input[data-field="subtask-name"][data-order="${s.order}"]`);
            const durInput = document.querySelector(`input[data-field="subtask-duration"][data-order="${s.order}"]`);
            return { ...s, name: nameInput ? nameInput.value.trim() : s.name, duration: durInput ? Math.max(5, parseInt(durInput.value) || s.duration) : s.duration };
        });
        const taskData = { ..._analysisDraft, title, description: Utils.el('inputDescription').value.trim(), deadline: Utils.el('inputDeadline').value, subtasks, total_duration: subtasks.reduce((sum, s) => sum + s.duration, 0) };

        if (_currentTaskId) {
            const existing = Agent.dispatch('task.get', { id: _currentTaskId });
            if (existing) {
                taskData.status = existing.status; taskData.progress = existing.progress;
                if (existing.subtasks.length === subtasks.length) taskData.subtasks = subtasks.map((s, i) => ({ ...s, done: existing.subtasks[i].done }));
            }
            const tid = _currentTaskId;
            Agent.dispatch('task.update', { id: tid, updates: taskData });
            WebAdapter.toast('任务已更新', 'success');
            closeTaskModal();
            _currentTaskId = tid;
            switchView('taskDetail');
        } else {
            const created = Agent.dispatch('task.create', { task: taskData });
            WebAdapter.toast('任务已创建', 'success');
            closeTaskModal();
            renderCurrent();
            if (created) _currentTaskId = created.task_id;
        }
    }

    /* ========== 语音输入（Web Speech API） ========== */
    function _initVoice() {
        const btn = Utils.el('todayMicBtn');
        if (!btn) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            btn.addEventListener('click', () => WebAdapter.toast('当前浏览器不支持语音输入', 'warning'));
            return;
        }
        const recog = new SR();
        recog.lang = 'zh-CN'; recog.interimResults = false; recog.maxAlternatives = 1;
        let active = false;
        btn.addEventListener('click', () => {
            if (active) { recog.stop(); return; }
            try { recog.start(); } catch (e) { /* 已在识别中 */ }
        });
        recog.onstart = () => { active = true; btn.classList.add('recording'); WebAdapter.toast('语音输入中…', 'default'); };
        recog.onend = () => { active = false; btn.classList.remove('recording'); };
        recog.onresult = (e) => {
            const text = e.results[0][0].transcript;
            WebAdapter.toast(`已识别：${text}，正在打开新建任务`, 'success');
            openTaskModal();
            setTimeout(() => { const i = Utils.el('inputTitle'); if (i) { i.value = text; i.focus(); } }, 100);
        };
        recog.onerror = (e) => { WebAdapter.toast('语音识别失败：' + (e.error || '未知错误'), 'error'); };
    }

    /* ========== Toast / Confirm ========== */
    function toast(message, type = 'default') {
        const container = Utils.el('toastContainer');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<span>${Utils.escape(message)}</span>`;
        container.appendChild(t);
        setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3000);
    }
    function confirm(message) {
        return new Promise((resolve) => {
            const modal = Utils.el('confirmModal');
            Utils.el('confirmMessage').textContent = message;
            modal.classList.add('active');
            const onOk = () => { _cleanup(); resolve(true); };
            const onCancel = () => { _cleanup(); resolve(false); };
            const _cleanup = () => {
                modal.classList.remove('active');
                Utils.el('btnConfirmOk').removeEventListener('click', onOk);
                Utils.el('btnConfirmCancel').removeEventListener('click', onCancel);
            };
            Utils.el('btnConfirmOk').addEventListener('click', onOk);
            Utils.el('btnConfirmCancel').addEventListener('click', onCancel);
        });
    }

    /* ========== 导航与事件 ========== */
    function _closeMobileNav() {
        Utils.el('topnav')?.classList.remove('open');
    }

    function bindEvents() {
        // 导航点击
        document.querySelectorAll('.nav-item').forEach(item =>
            item.addEventListener('click', () => switchView(item.dataset.view)));
        // 品牌点击回首页
        Utils.el('topbar').querySelector('.brand')?.addEventListener('click', () => switchView('taskList'));
        // 移动端菜单
        Utils.el('navMobileToggle')?.addEventListener('click', () => Utils.el('topnav').classList.toggle('open'));
        // 其他功能 Grid 卡片导航
        document.querySelectorAll('.more-card').forEach(card =>
            card.addEventListener('click', () => switchView(card.dataset.view)));

        Utils.el('btnNewTask').addEventListener('click', () => openTaskModal());
        Utils.el('modalClose').addEventListener('click', closeTaskModal);
        Utils.el('btnCancelTask').addEventListener('click', closeTaskModal);
        Utils.el('taskModal').addEventListener('click', e => { if (e.target === Utils.el('taskModal')) closeTaskModal(); });
        Utils.el('btnAnalyzeTask').addEventListener('click', runAnalysis);
        Utils.el('btnSaveTask').addEventListener('click', saveTask);
        Utils.el('btnBackToList').addEventListener('click', () => switchView('taskList'));

        ['searchInput', 'filterType', 'filterStatus', 'filterPriority', 'sortBy'].forEach(id => {
            const el = Utils.el(id);
            el.addEventListener('input', () => { if (_currentView === 'taskList') renderTaskList(); });
            el.addEventListener('change', () => { if (_currentView === 'taskList') renderTaskList(); });
        });

        // 全局委托
        document.addEventListener('click', (e) => {
            const view = e.target.closest('[data-action="view"]');
            if (view && view.dataset.taskId && !e.target.classList.contains('task-check') && !e.target.closest('.task-check')) {
                _currentTaskId = view.dataset.taskId;
                switchView('taskDetail');
                return;
            }
            const editBtn = e.target.closest('[data-action="edit"]');
            if (editBtn) { e.stopPropagation(); openTaskModal(editBtn.dataset.id); return; }
            const delBtn = e.target.closest('[data-action="delete"]');
            if (delBtn) {
                e.stopPropagation();
                confirm('确定要删除这个任务吗？此操作不可撤销。').then(ok => {
                    if (ok) { Agent.dispatch('task.delete', { id: delBtn.dataset.id }); toast('任务已删除', 'success'); switchView('taskList'); }
                });
                return;
            }
            const subChk = e.target.closest('[data-action="toggle-subtask"]');
            if (subChk) { e.stopPropagation(); Agent.dispatch('task.toggleSubtask', { id: subChk.dataset.id, index: parseInt(subChk.dataset.index) }); return; }
            const chk = e.target.closest('[data-action="toggle"]');
            if (chk) {
                e.stopPropagation();
                const t = Agent.dispatch('task.get', { id: chk.dataset.id });
                if (t) { Agent.dispatch('task.setStatus', { id: t.task_id, status: t.status === 'completed' ? 'pending' : 'completed' }); renderCurrent(); }
            }
            // AI 陪伴控件
            if (e.target.closest('#cpStartBtn') || e.target.closest('#cpToggle') || e.target.closest('.cp-action')) {
                _bindCompanion();
            }
        });

        document.addEventListener('change', (e) => {
            const statusSel = e.target.closest('[data-action="status-change"]');
            if (statusSel) { Agent.dispatch('task.setStatus', { id: statusSel.dataset.id, status: statusSel.value }); toast('状态已更新', 'success'); renderTaskDetail(statusSel.dataset.id); }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && Utils.el('taskModal').classList.contains('active')) closeTaskModal();
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && Utils.el('taskModal').classList.contains('active')) saveTask();
        });

        _initVoice();

        // 事件总线订阅：数据变更自动刷新
        EventBus.on('task:created', () => { if (_currentView === 'taskList' || _currentView === 'todayTasks') renderCurrent(); });
        EventBus.on('task:updated', () => { if (_currentView !== 'chat') renderCurrent(); });
        EventBus.on('task:deleted', () => { if (_currentView === 'taskList' || _currentView === 'todayTasks' || _currentView === 'taskDetail') renderCurrent(); });
        EventBus.on('data:cleared', () => renderCurrent());
        EventBus.on('data:imported', () => renderCurrent());
    }

    /* ========== 启动 ========== */
    function start() {
        Agent.init();
        bindEvents();
        switchView('taskList');
        Logger.info('[WebAdapter] Web 端接入就绪 (Apple v3.0)');
    }

    return {
        start, switchView, renderCurrent,
        openTaskModal, closeTaskModal, runAnalysis, saveTask,
        toast, confirm,
        get currentView() { return _currentView; }
    };
})();
