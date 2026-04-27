import { useState, useEffect, useRef } from 'react'

function App() {
  const [history, setHistory] = useState([
    { type: 'info', content: 'Microsoft Windows [Version 10.0.19045.5131]' },
    { type: 'info', content: '(c) Microsoft Corporation. All rights reserved.' },
    { type: 'info', content: '' },
    { type: 'info', content: 'Enter /mode to begin instruction input.' },
  ])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('std') // 'std' or 'input'
  const [instruction, setInstruction] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [token, setToken] = useState(localStorage.getItem('session_token') || '')

  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const handleInput = (e) => {
    if (e.key === 'Enter') {
      const cmd = input.trim()
      if (cmd === '') return

      if (mode === 'std') {
        setHistory(prev => [...prev, { type: 'command', content: `mysql> ${cmd}` }])
        if (cmd === '/mode') {
          setMode('input')
          setHistory(prev => [...prev, { type: 'system', content: 'Instruction mode active. Enter requirement:' }])
        } else if (cmd.startsWith('set session ')) {
          const key = cmd.replace('set session ', '').trim()
          setToken(key)
          localStorage.setItem('session_token', key)
          setHistory(prev => [...prev, { type: 'success', content: 'Session updated.' }])
        } else if (cmd === 'clear') {
          setHistory([])
        } else {
          setHistory(prev => [...prev, { type: 'error', content: `'${cmd}' is not recognized as an internal or external command.` }])
        }
      } else if (mode === 'input') {
        setHistory(prev => [...prev, { type: 'command', content: `Requirement: ${cmd}` }])
        setInstruction(cmd)
        setHistory(prev => [...prev, { type: 'system', content: 'Instruction logged. Click the terminal marker to process.' }])
      }
      setInput('')
    }
  }

  const runProcess = async () => {
    if (!instruction) return
    if (!token) {
      setHistory(prev => [...prev, { type: 'error', content: 'Error: Session token missing. Use "set session <token>"' }])
      return
    }

    setIsProcessing(true)
    setHistory(prev => [...prev, { type: 'system', content: 'Establishing connection...' }])

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: "You are a senior database engineer. For the given request, provide the DDL commands (CREATE TABLE) for all necessary tables, followed by INSERT statements with realistic sample data, and finally the main SQL query to answer the request. Return ONLY the SQL code. Use clean formatting. No commentary and no comments."
            },
            {
              role: "user",
              content: instruction
            }
          ],
          temperature: 0.1
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ? data.error.message : "Request failed");
      }

      const result = data.choices[0].message.content;
      setHistory(prev => [...prev, { type: 'result', content: result }])
      setMode('std')
      setInstruction('')
    } catch (error) {
      setHistory(prev => [...prev, { type: 'error', content: `Process Error: ${error.message}` }])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0c0c0c]">
      {/* CMD Window Frame - Full Screen */}
      <div className="w-full h-full flex flex-col bg-[#0c0c0c] overflow-hidden border-none">

        {/* Header / Title Bar */}
        <div className="h-8 bg-[#202020] flex items-center justify-between px-2 select-none shrink-0 border-b border-[#303030]">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 3V13H15V3H1ZM2 4H14V12H2V4ZM3 5V6H5V5H3ZM3 7V8H11V7H3ZM3 9V10H7V9H3Z" fill="#cccccc" />
            </svg>
            <span className="text-xs text-[#cccccc]">C:\WINDOWS\system32\cmd.</span>
          </div>

          <div className="flex items-center h-full">
            {/* Minimize */}
            <div className="w-12 h-full flex items-center justify-center hover:bg-[#333333] transition-colors cursor-default">
              <div className="w-2.5 h-px bg-[#cccccc]"></div>
            </div>
            {/* Maximize (Triggers Process) */}
            <div
              onClick={(e) => { e.stopPropagation(); runProcess(); }}
              className="w-12 h-full flex items-center justify-center hover:bg-[#333333] transition-colors cursor-default"
            >
              <div className="w-2.5 h-2.5 border border-[#cccccc]"></div>
            </div>
            {/* Close */}
            <div className="w-12 h-full flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors cursor-default group">
              <svg width="10" height="10" viewBox="0 0 10 10" className="stroke-[#cccccc] group-hover:stroke-white">
                <path d="M1 1L9 9M9 1L1 9" />
              </svg>
            </div>
          </div>
        </div>

        {/* Terminal Content Area */}
        <div
          className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-800"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="mb-4">
            {history.map((line, i) => (
              <div key={i} className="mb-0.5 whitespace-pre-wrap leading-tight">
                {line.type === 'command' && <span className="text-[#cccccc]">{line.content}</span>}
                {line.type === 'system' && <span className="text-[#cccccc]">{line.content}</span>}
                {line.type === 'info' && <span className="text-[#cccccc]">{line.content}</span>}
                {line.type === 'error' && <span className="text-[#ff5555]">{line.content}</span>}
                {line.type === 'success' && <span className="text-[#50fa7b]">{line.content}</span>}
                {line.type === 'result' && (
                  <div className="mt-2 text-[#cccccc] font-mono whitespace-pre">
                    {line.content}
                  </div>
                )}
              </div>
            ))}
            {isProcessing && <div className="text-[#cccccc] animate-pulse mt-1">Processing...</div>}
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0">{mode === 'std' ? 'mysql>' : 'Requirement>'}</span>
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-[#cccccc] caret-[#cccccc]"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInput}
              autoFocus
            />
          </div>

          <div ref={bottomRef} className="h-8" />
        </div>
      </div>

    </div>
  )
}

export default App
