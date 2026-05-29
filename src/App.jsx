import { useState, useEffect } from 'react'
import './App.css'

// 請在此替換為你的 Google Apps Script 部署網址
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwC0gqDiFZLLxD9_HOtkDJFuYiOb0gJDOwkMtkG8e-ifNXkW5WgkVkfGN-UUqipQusm/exec';

function App() {
  const [events, setEvents] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({
    summary: '',
    start: '2026-05-29T09:00',
    end: '2026-05-29T10:00',
    category: '工作'
  });

  // 從 Google Sheets 獲取資料
  const fetchEvents = async () => {
    if (GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') return;
    try {
      setIsSyncing(true);
      const response = await fetch(GAS_URL);
      const data = await response.json();
      
      // 簡單比對資料長度或內容，減少不必要的 state 更新
      if (JSON.stringify(data) !== JSON.stringify(events)) {
        setEvents(data);
      }
    } catch (error) {
      console.error("無法獲取行事曆資料:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // 設定定時同步 (每 15 秒檢查一次 Sheet 更新)
  useEffect(() => {
    fetchEvents(); // 初始讀取
    const interval = setInterval(fetchEvents, 15000); 
    return () => clearInterval(interval);
  }, [events]); // 當 events 更新時重新檢查

  // 新增事項
  const handleAddEvent = async (e) => {
    e.preventDefault();
    const newEvent = { ...formData, action: 'add' };
    const optimisticEvents = [...events, formData];
    setEvents(optimisticEvents); // 樂觀 UI 更新：先在畫面上顯示
    
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(newEvent)
      });
      setEvents([...events, formData]);
      setFormData({ ...formData, summary: '' });
    } catch (error) {
      fetchEvents(); // 如果失敗，重新抓取 Sheets 資料以修正 UI
      console.error("儲存失敗:", error);
    }
  };

  // 匯出 ICS 格式
  const exportToICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//My Calendar//20260529//EN\n";
    
    events.forEach(event => {
      const start = event.start.replace(/[-:]/g, '') + '00Z';
      const end = event.end.replace(/[-:]/g, '') + '00Z';
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `SUMMARY:${event.summary}\n`;
      icsContent += `DTSTART:${start}\n`;
      icsContent += `DTEND:${end}\n`;
      icsContent += `CATEGORIES:${event.category}\n`;
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `calendar-events-2026-05-29.ics`;
    link.click();
  };

  // 匯入 ICS 格式
  const handleImportICS = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const vevents = text.split("BEGIN:VEVENT");
      vevents.shift(); // 移除 header 部分

      const importedEvents = vevents.map(vevent => {
        const summary = vevent.match(/SUMMARY:(.*)/)?.[1] || "未命名事項";
        const category = vevent.match(/CATEGORIES:(.*)/)?.[1] || "未分類";
        // 簡易時間解析 (YYYYMMDDTHHMMSSZ -> YYYY-MM-DDTHH:MM)
        const startRaw = vevent.match(/DTSTART:(.*)/)?.[1] || "";
        const start = startRaw ? `${startRaw.slice(0,4)}-${startRaw.slice(4,6)}-${startRaw.slice(6,8)}T${startRaw.slice(9,11)}:${startRaw.slice(11,13)}` : "";
        const endRaw = vevent.match(/DTEND:(.*)/)?.[1] || "";
        const end = endRaw ? `${endRaw.slice(0,4)}-${endRaw.slice(4,6)}-${endRaw.slice(6,8)}T${endRaw.slice(9,11)}:${endRaw.slice(11,13)}` : "";
        
        return { summary, start, end, category };
      });

      // 同步到 Google Sheets
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'sync', data: [...events, ...importedEvents] })
      });
      setEvents([...events, ...importedEvents]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="calendar-container">
      <header>
        <h1>行事曆管理系統</h1>
        <div className={`sync-status ${isSyncing ? 'syncing' : ''}`}>同步中...</div>
      </header>
      
      <div className="controls">
        <button onClick={exportToICS}>匯出 ICS</button>
        <label className="import-label">
          匯入 ICS
          <input type="file" accept=".ics" onChange={handleImportICS} style={{display: 'none'}} />
        </label>
      </div>

      <form onSubmit={handleAddEvent} className="event-form">
        <input 
          type="text" 
          placeholder="事項名稱" 
          value={formData.summary} 
          onChange={(e) => setFormData({...formData, summary: e.target.value})}
          required 
        />
        <input 
          type="datetime-local" 
          value={formData.start} 
          onChange={(e) => setFormData({...formData, start: e.target.value})}
        />
        <input 
          type="datetime-local" 
          value={formData.end} 
          onChange={(e) => setFormData({...formData, end: e.target.value})}
        />
        <select 
          value={formData.category} 
          onChange={(e) => setFormData({...formData, category: e.target.value})}
        >
          <option value="工作">工作</option>
          <option value="個人">個人</option>
          <option value="緊急">緊急</option>
          <option value="其他">其他</option>
        </select>
        <button type="submit">新增事項</button>
      </form>

      <div className="event-list">
        <h2>事項列表</h2>
        {events.length === 0 ? <p>目前沒有事項</p> : (
          <table>
            <thead>
              <tr>
                <th>摘要</th>
                <th>開始時間</th>
                <th>結束時間</th>
                <th>分類</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, index) => (
                <tr key={index}>
                  <td>{ev.summary}</td>
                  <td>{ev.start}</td>
                  <td>{ev.end}</td>
                  <td><span className={`badge ${ev.category}`}>{ev.category}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default App
