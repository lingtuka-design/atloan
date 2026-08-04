import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useContext, useRef } from 'react'
import { AuthContext } from './__root'

export const Route = createFileRoute('/dak')({
  component: DakComponent,
})

interface DakRecord {
  id: string
  sl_no: number
  receive_no: string
  name: string
  department: string
  case_type: string
  amount: string
  action: string
  remarks?: string
  issue_date: string
  assigned_to: string
  created_by: string
  is_new: number
  created_at: string
}

interface IssueRecord {
  id: string
  sl_no: number
  receive_no: string
  name: string
  address: string
  case_type: string
  issue_date: string
  issue_no: string
  sent: string
  phone_number: string
  created_by: string
  created_at: string
}

const getCurrentMonthStr = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const formatDMY = (dateStr: string) => {
  if (!dateStr) return ''
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`
    }
  }
  return dateStr
}

function DakComponent() {
  const auth = useContext(AuthContext)
  const [dakTab, setDakTab] = useState<'receive' | 'issue'>('receive')
  const [records, setRecords] = useState<DakRecord[]>([])
  const [issueRecords, setIssueRecords] = useState<IssueRecord[]>([])
  const [users, setUsers] = useState<any[]>([])
  
  // Admin Form State (Receive)
  const [assignTo, setAssignTo] = useState('')
  const [receiveNo, setReceiveNo] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [caseType, setCaseType] = useState('DC')

  // Admin Form State (Issue)
  const [issueReceiveNo, setIssueReceiveNo] = useState('')
  const [issueName, setIssueName] = useState('')
  const [issueAddress, setIssueAddress] = useState('')
  const [issueCaseType, setIssueCaseType] = useState('DC')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [issueNo, setIssueNo] = useState('')
  const [issueSent, setIssueSent] = useState('')
  const [issuePhoneNumber, setIssuePhoneNumber] = useState('')
  
  // Filters (Receive)
  const [filterMonth, setFilterMonth] = useState(getCurrentMonthStr)
  const [filterDate, setFilterDate] = useState('')
  const [searchName, setSearchName] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterStaff, setFilterStaff] = useState('All')

  // Filters (Issue)
  const [issueFilterMonth, setIssueFilterMonth] = useState(getCurrentMonthStr)
  const [issueSearchName, setIssueSearchName] = useState('')
  
  // Remarks Modal State
  const [activeRemarksModal, setActiveRemarksModal] = useState<{ id: string; name: string; receive_no: string; remarks: string } | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const initialFilterSet = useRef(false)

  useEffect(() => {
    setCurrentPage(1)
  }, [filterMonth, filterDate, searchName, filterStatus, filterStaff])

  useEffect(() => {
    if (auth?.user) {
      fetchRecords()
      if (auth.user.role === 'admin') {
        fetchUsers()
        fetchIssueRecords()
        if (!initialFilterSet.current) {
          const usernameLower = auth.user.username.toLowerCase()
          const nameLower = (auth.user.name || '').toLowerCase()
          const isSuperAdmin = usernameLower === 'mala' || usernameLower === 'h zonunmawii' || nameLower.includes('zonunmawii')
          if (!isSuperAdmin) {
            setFilterStaff(auth.user.username)
          }
          initialFilterSet.current = true
        }
      }
    }
  }, [auth])

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/dak')
      if (res.ok) {
        const data = await res.json()
        setRecords(data)
        window.dispatchEvent(new Event('dak-read'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchIssueRecords = async () => {
    try {
      const res = await fetch('/api/dak_issue')
      if (res.ok) {
        const data = await res.json()
        setIssueRecords(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.filter((u: any) => u.username.toLowerCase() !== 'mala')) // Allow assigning to anyone except Super Admin 'mala'
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleNameClickToIssue = (record: DakRecord) => {
    setDakTab('issue')
    setIssueReceiveNo(record.receive_no || '')
    setIssueName(record.name || '')
    setIssueAddress(record.department || '')
    setIssueCaseType(record.case_type || 'DC')
    setIssueDate(new Date().toISOString().split('T')[0])
    setIssueNo('')
    setIssueSent('')
    setIssuePhoneNumber('')
    setIssueSearchName(record.name)
  }

  const updateIssueRecord = async (id: string, updates: any) => {
    try {
      const res = await fetch('/api/dak_issue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })
      if (res.ok) {
        setIssueRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/dak_issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receive_no: issueReceiveNo,
          name: issueName,
          address: issueAddress,
          case_type: issueCaseType,
          issue_date: issueDate,
          issue_no: issueNo,
          sent: '',
          phone_number: ''
        })
      })
      if (res.ok) {
        setIssueReceiveNo('')
        setIssueName('')
        setIssueAddress('')
        setIssueCaseType('DC')
        setIssueNo('')
        setIssueSent('')
        setIssuePhoneNumber('')
        setIssueSearchName('')
        fetchIssueRecords()
        fetchRecords()
      }
    } catch (e) {
      alert("Error creating Issue record")
    }
  }

  const handleDeleteIssue = async (id: string) => {
    if (!confirm('He Issue record hi i delete duh takzet em?')) return
    try {
      const res = await fetch(`/api/dak_issue?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchIssueRecords()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignTo) {
      alert("Khawngaihin Staff thlang rawh")
      return
    }

    const today = new Date()
    const sentDateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear().toString().slice(-2)}`

    try {
      const res = await fetch('/api/dak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receive_no: receiveNo,
          name: name,
          department: department,
          case_type: caseType,
          amount: caseType === 'NDC' ? 'N/A' : '',
          sent_date: sentDateStr,
          assigned_to: assignTo
        })
      })
      if (res.ok) {
        setReceiveNo('')
        setName('')
        setDepartment('')
        setCaseType('DC')
        fetchRecords()
      }
    } catch (e) {
      alert("Error sending case")
    }
  }

  const updateRecord = async (id: string, updates: any) => {
    try {
      const res = await fetch('/api/dak', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })
      if (res.ok) {
        fetchRecords()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleActionChange = (id: string, val: string) => {
    updateRecord(id, { action: val })
  }

  const handleCaseTypeChange = (id: string, val: string) => {
    if (val === 'NDC') {
      updateRecord(id, { case_type: val, amount: 'N/A' })
      setRecords(records.map(rec => rec.id === id ? { ...rec, case_type: val, amount: 'N/A' } : rec))
    } else {
      const existing = records.find(r => r.id === id)
      const newAmount = existing?.amount === 'N/A' ? '' : (existing?.amount || '')
      updateRecord(id, { case_type: val, amount: newAmount })
      setRecords(records.map(rec => rec.id === id ? { ...rec, case_type: val, amount: newAmount } : rec))
    }
  }

  const handleAmountBlur = (id: string, val: string) => {
    updateRecord(id, { amount: val })
  }

  const handleRemarksBlur = (id: string, val: string) => {
    updateRecord(id, { remarks: val })
  }

  const handleIssueDateBlur = (id: string, val: string) => {
    if (val.trim() !== '') {
      updateRecord(id, { issue_date: val, action: 'Settled' })
    } else {
      updateRecord(id, { issue_date: val })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('He record hi i delete duh takzet em?')) return
    try {
      const res = await fetch(`/api/dak?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchRecords()
      } else {
        alert('Delete theih a ni lo')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredRecords = records.filter(r => {
    if (searchName && !r.name.toLowerCase().includes(searchName.toLowerCase())) return false
    if (filterStatus !== 'All' && r.action !== filterStatus) return false
    if (filterStaff !== 'All' && r.assigned_to !== filterStaff) return false
    if (filterMonth !== 'All' && !r.created_at.includes(filterMonth)) return false
    if (filterDate && !r.created_at.startsWith(filterDate)) return false
    return true
  })

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Group by date (using created_at YYYY-MM-DD for grouping, and showing staff name if admin)
  const groupedRecords: Record<string, DakRecord[]> = {}
  paginatedRecords.forEach(r => {
    const d = r.created_at.split(' ')[0] // YYYY-MM-DD
    const key = auth?.user?.role === 'admin' ? `${r.assigned_to}_${d}` : d
    if (!groupedRecords[key]) groupedRecords[key] = []
    groupedRecords[key].push(r)
  })

  if (loading) return <div>Loading...</div>

  return (
    <div className="dak-print-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .dak-print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .dak-group-box {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
          }
          .dak-group-box:last-child {
            margin-bottom: 0 !important;
          }
          h1 {
            display: none !important;
          }
          h3 {
            margin: 0 0 10px 0 !important;
            font-size: 16px !important;
            color: black !important;
            text-decoration: underline !important;
          }
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 13px !important;
            margin-top: 5px !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 6px 6px !important;
            font-size: 13px !important;
            color: black !important;
          }
          .col-sl { width: 35px !important; text-align: center !important; }
          .col-receive { width: 65px !important; }
          .col-name { white-space: normal !important; word-break: break-word !important; }
          .col-dept { white-space: normal !important; word-break: break-word !important; }
          .col-case { width: 75px !important; text-align: center !important; }
          .col-amount { width: 70px !important; text-align: center !important; }
          .col-action { width: 75px !important; text-align: center !important; }
          .col-remarks { width: 105px !important; text-align: left !important; white-space: normal !important; word-break: break-word !important; }
          .col-issue { width: 75px !important; text-align: center !important; }
          
          input, select, textarea {
            border: none !important;
            background: transparent !important;
            color: black !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            font-size: 13px !important;
            padding: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            font-family: inherit !important;
            resize: none !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
          }
        }
      `}</style>
      <h1 style={{ color: '#243b53', borderBottom: '2px solid #bcccdc', paddingBottom: '10px' }}>Dak Management</h1>
      
      {/* Menu Sub-tabs for Admin (Receive & Issue) */}
      {auth?.user?.role === 'admin' && (
        <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <button
            type="button"
            onClick={() => setDakTab('receive')}
            style={{
              padding: '10px 24px',
              fontWeight: 'bold',
              fontSize: '15px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: dakTab === 'receive' ? '#102a43' : '#e2e8f0',
              color: dakTab === 'receive' ? 'white' : '#334e68',
              boxShadow: dakTab === 'receive' ? '0 2px 4px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            📥 Receive Dak
          </button>
          <button
            type="button"
            onClick={() => setDakTab('issue')}
            style={{
              padding: '10px 24px',
              fontWeight: 'bold',
              fontSize: '15px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: dakTab === 'issue' ? '#102a43' : '#e2e8f0',
              color: dakTab === 'issue' ? 'white' : '#334e68',
              boxShadow: dakTab === 'issue' ? '0 2px 4px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            📤 Issue Dak
          </button>
        </div>
      )}

      {/* RECEIVE VIEW */}
      {dakTab === 'receive' && (
        <>
          {auth?.user?.role === 'admin' && (
            <div className="no-print" style={{ background: '#f0f4f8', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #d9e2ec' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#102a43' }}>Assign New Case</h3>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Staff Select</label>
                  <select value={assignTo} onChange={e => setAssignTo(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="">-- Select Staff --</option>
                    {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Receive No.</label>
                  <input type="text" value={receiveNo} onChange={e => setReceiveNo(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1.5, minWidth: '200px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '250px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Department</label>
                  <input type="text" value={department} onChange={e => setDepartment(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Case</label>
                  <select value={caseType} onChange={e => setCaseType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="DC">DC</option>
                    <option value="NDC">NDC</option>
                    <option value="Challan">Challan</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', height: '35px' }}>
                  SENT
                </button>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="no-print" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {auth?.user?.role === 'admin' && (
              <select
                value={filterStaff}
                onChange={e => {
                  setFilterStaff(e.target.value)
                  setFilterMonth(getCurrentMonthStr())
                  setFilterDate('')
                }}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="All">All Staff</option>
                {users.map(u => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
            )}
            <input type="text" placeholder="Search Name..." value={searchName} onChange={e => setSearchName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="All">All Actions</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Settled">Settled</option>
            </select>
            <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDate('') }} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterMonth('All') }} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <button onClick={() => window.print()} style={{ padding: '8px 15px', background: '#334e68', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Print</button>
          </div>

          {Object.keys(groupedRecords).sort().reverse().map(key => {
            let title = ''
            if (auth?.user?.role === 'admin') {
              const [staff, d] = key.split('_')
              const desig = groupedRecords[key][0]?.user_designation
              const namePart = desig ? `${staff} - ${desig}` : staff
              const dateObj = new Date(d)
              title = `${namePart} Dak : ${dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (${dateObj.toLocaleDateString('en-US', { weekday: 'long' })})`
            } else {
              const dateObj = new Date(key)
              const desig = groupedRecords[key][0]?.user_designation
              const namePart = desig ? `${auth.user?.username} - ${desig}` : (auth.user?.username || '')
              title = `${namePart ? namePart + ' ' : ''}Dak : ${dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (${dateObj.toLocaleDateString('en-US', { weekday: 'long' })})`
            }

            return (
              <div key={key} className="dak-group-box" style={{ marginBottom: '40px', background: 'white', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#102a43', textDecoration: 'underline' }}>{title}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ border: '1px solid #000' }}>
                      <th className="col-sl" style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '35px' }}>Sl. No</th>
                      <th className="col-receive" style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', width: '65px' }}>Receive No.</th>
                      <th className="col-name" style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Name</th>
                      <th className="col-dept" style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Department</th>
                      <th className="col-case" style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '90px' }}>Case</th>
                      <th className="col-amount" style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '75px' }}>Amount</th>
                      <th className="col-action" style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '80px' }}>Action</th>
                      <th className="col-remarks" style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', width: '130px' }}>Remarks</th>
                      <th className="col-issue" style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '85px' }}>Issue</th>
                      {auth?.user?.role === 'admin' && (
                        <th className="no-print" style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '60px', boxSizing: 'border-box' }}></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRecords[key].map(r => (
                      <tr key={r.id} style={{ border: '1px solid #000' }}>
                        <td className="col-sl" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{r.sl_no}.</td>
                        <td className="col-receive" style={{ border: '1px solid #000', padding: '8px' }}>{r.receive_no}</td>
                        <td className="col-name" style={{ border: '1px solid #000', padding: '8px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {auth?.user?.role === 'admin' ? (
                            <button
                              type="button"
                              onClick={() => handleNameClickToIssue(r)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#1565c0',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                textAlign: 'left',
                                padding: 0,
                                fontSize: 'inherit',
                                fontFamily: 'inherit'
                              }}
                              title="Click to process Issue for this person"
                            >
                              {r.name}
                            </button>
                          ) : (
                            r.name
                          )}
                        </td>
                        <td className="col-dept" style={{ border: '1px solid #000', padding: '8px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.department}</td>
                        
                        <td className="col-case" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          {auth?.user?.username?.toLowerCase() === 'mala' ? (
                            r.case_type
                          ) : (
                            <select value={r.case_type} onChange={e => handleCaseTypeChange(r.id, e.target.value)} style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', fontSize: '13px', boxSizing: 'border-box' }}>
                              <option value="DC">DC</option>
                              <option value="NDC">NDC</option>
                              <option value="Challan">Challan</option>
                              <option value="Others">Others</option>
                            </select>
                          )}
                        </td>

                        <td className="col-amount" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          {r.case_type === 'NDC' ? (
                            <span style={{ color: '#555', fontWeight: 'bold', fontSize: '13px' }}>N/A</span>
                          ) : auth?.user?.username?.toLowerCase() === 'mala' ? (
                            r.amount || ''
                          ) : (
                            <input
                              type="text"
                              value={r.amount || ''}
                              onChange={(e) => {
                                const newAmount = e.target.value
                                setRecords(records.map(rec => rec.id === r.id ? { ...rec, amount: newAmount } : rec))
                              }}
                              onBlur={(e) => handleAmountBlur(r.id, e.target.value)}
                              style={{ width: '100%', padding: '4px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                              placeholder="Amount"
                            />
                          )}
                        </td>
                        
                        <td className="col-action" style={{ 
                          border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold',
                          background: r.action === 'Pending' ? '#ffcdd2' : (r.action === 'Processing' ? '#fff9c4' : '#c8e6c9'),
                          color: r.action === 'Pending' ? '#c62828' : (r.action === 'Processing' ? '#f57f17' : '#2e7d32')
                        }}>
                          {auth?.user?.username?.toLowerCase() === 'mala' ? (
                            r.action === 'Processing' ? 'Process' : r.action
                          ) : (
                            <select value={r.action} onChange={e => handleActionChange(r.id, e.target.value)} style={{ padding: '4px', border: 'none', background: 'transparent', fontWeight: 'bold', width: '100%', color: 'inherit' }}>
                              <option value="Pending" style={{color: 'black'}}>Pending</option>
                              <option value="Processing" style={{color: 'black'}}>Process</option>
                              <option value="Settled" style={{color: 'black'}}>Settled</option>
                            </select>
                          )}
                        </td>

                        <td className="col-remarks" style={{ border: '1px solid #000', padding: '4px', textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {auth?.user?.username?.toLowerCase() === 'mala' ? (
                            <div 
                              onClick={() => r.remarks && setActiveRemarksModal({ id: r.id, name: r.name, receive_no: r.receive_no, remarks: r.remarks || '' })}
                              style={{ fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: r.remarks ? 'pointer' : 'default' }}
                              title={r.remarks ? "Click to view full remarks popup" : ""}
                            >
                              {r.remarks || ''}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <textarea
                                rows={1}
                                value={r.remarks || ''}
                                onChange={(e) => {
                                  const newRemarks = e.target.value
                                  setRecords(records.map(rec => rec.id === r.id ? { ...rec, remarks: newRemarks } : rec))
                                }}
                                onBlur={(e) => handleRemarksBlur(r.id, e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '4px',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                  fontFamily: 'inherit',
                                  resize: 'vertical',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  boxSizing: 'border-box'
                                }}
                                placeholder="Remarks"
                              />
                              <button
                                type="button"
                                className="no-print"
                                onClick={() => setActiveRemarksModal({ id: r.id, name: r.name, receive_no: r.receive_no, remarks: r.remarks || '' })}
                                title="Pop up - Text pumpui enna/ziahna"
                                style={{
                                  background: '#e2e8f0',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                🔍
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="col-issue" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          {auth?.user?.username?.toLowerCase() === 'mala' ? (
                            r.issue_date
                          ) : (
                            <input 
                              type="text" 
                              defaultValue={r.issue_date} 
                              onBlur={e => handleIssueDateBlur(r.id, e.target.value)}
                              style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          )}
                        </td>

                        {auth?.user?.role === 'admin' && (
                          <td className="no-print" style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '60px', boxSizing: 'border-box' }}>
                            <button onClick={() => handleDelete(r.id)} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', maxWidth: '100%', boxSizing: 'border-box' }}>
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}

          {filteredRecords.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '8px', color: '#777' }}>
              Record hmuh a ni lo.
            </div>
          )}

          {totalPages > 1 && (
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '30px' }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: currentPage === 1 ? '#f0f0f0' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              
              <span style={{ fontWeight: 'bold' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: currentPage === totalPages ? '#f0f0f0' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* ISSUE VIEW (ADMIN ONLY) */}
      {dakTab === 'issue' && auth?.user?.role === 'admin' && (
        <>
          <div className="no-print" style={{ background: '#f0f4f8', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #d9e2ec' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#102a43' }}>Issue New Case</h3>
            <form onSubmit={handleCreateIssue} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Receive No.</label>
                <input type="text" value={issueReceiveNo} onChange={e => setIssueReceiveNo(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1.5, minWidth: '180px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Name</label>
                <input type="text" value={issueName} onChange={e => setIssueName(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '110px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Case</label>
                <select value={issueCaseType} onChange={e => setIssueCaseType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="DC">DC</option>
                  <option value="NDC">NDC</option>
                  <option value="Mortgaged">Mortgaged</option>
                  <option value="Challan">Challan</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '130px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Issue Date</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '220px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Address</label>
                <input type="text" value={issueAddress} onChange={e => setIssueAddress(e.target.value)} required placeholder="Manual Address" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Issue No.</label>
                <input type="text" value={issueNo} onChange={e => setIssueNo(e.target.value)} placeholder="Issue No." style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <button type="submit" style={{ padding: '10px 20px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', height: '35px' }}>
                ISSUE
              </button>
            </form>
          </div>

          {/* Filters (Issue) */}
          <div className="no-print" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Search Name..." 
              value={issueSearchName} 
              onChange={e => setIssueSearchName(e.target.value)} 
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }} 
            />
            <input 
              type="month" 
              value={issueFilterMonth} 
              onChange={e => setIssueFilterMonth(e.target.value)} 
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
            />
            {issueSearchName && (
              <button 
                onClick={() => setIssueSearchName('')}
                style={{ padding: '8px 12px', background: '#e2e8f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                Clear Search Filter
              </button>
            )}
            <button onClick={() => window.print()} style={{ padding: '8px 15px', background: '#334e68', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Print Issue List</button>
          </div>

          {/* Issue Records Table */}
          <div className="dak-group-box" style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#102a43', textDecoration: 'underline' }}>
              Issue Register Records ({issueFilterMonth})
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '14px' }}>
              <thead>
                <tr style={{ border: '1px solid #000', background: '#f8fafc' }}>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '40px' }}>Sl. No</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', width: '85px' }}>Receive No.</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Name</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Address</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '90px' }}>Case</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '95px' }}>Issue Date</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '90px' }}>Issue No.</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', width: '120px' }}>Sent</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '120px' }}>Phone Number</th>
                  <th className="no-print" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {issueRecords.filter(r => {
                  if (issueSearchName && !r.name.toLowerCase().includes(issueSearchName.toLowerCase())) return false
                  if (issueFilterMonth !== 'All' && !r.created_at.includes(issueFilterMonth)) return false
                  return true
                }).map(r => (
                  <tr key={r.id} style={{ border: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{r.sl_no}.</td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}>{r.receive_no}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{r.name}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.address}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{r.case_type}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{formatDMY(r.issue_date)}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{r.issue_no}</td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}>
                      <input
                        type="text"
                        value={r.sent || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setIssueRecords(prev => prev.map(rec => rec.id === r.id ? { ...rec, sent: val } : rec))
                        }}
                        onBlur={(e) => updateIssueRecord(r.id, { sent: e.target.value })}
                        placeholder="Speed Post / Hand..."
                        style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}>
                      <input
                        type="text"
                        value={r.phone_number || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setIssueRecords(prev => prev.map(rec => rec.id === r.id ? { ...rec, phone_number: val } : rec))
                        }}
                        onBlur={(e) => updateIssueRecord(r.id, { phone_number: e.target.value })}
                        placeholder="Phone No."
                        style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', textAlign: 'center' }}
                      />
                    </td>
                    <td className="no-print" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteIssue(r.id)} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {issueRecords.filter(r => {
              if (issueSearchName && !r.name.toLowerCase().includes(issueSearchName.toLowerCase())) return false
              if (issueFilterMonth !== 'All' && !r.created_at.includes(issueFilterMonth)) return false
              return true
            }).length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                Issue Record hmuh a ni lo.
              </div>
            )}
          </div>
        </>
      )}

      {/* Pop up Modal for full Remarks */}
      {activeRemarksModal && (
        <div 
          className="no-print"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div style={{ background: 'white', borderRadius: '8px', width: '100%', maxWidth: '550px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#102a43', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Remarks - {activeRemarksModal.name} (Rec No: {activeRemarksModal.receive_no})
            </h3>
            
            {auth?.user?.username?.toLowerCase() === 'mala' ? (
              <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef', minHeight: '120px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '14px', lineHeight: '1.5' }}>
                {activeRemarksModal.remarks || '(Remarks a awm lo)'}
              </div>
            ) : (
              <textarea
                rows={8}
                value={activeRemarksModal.remarks}
                onChange={(e) => {
                  const val = e.target.value
                  setActiveRemarksModal({ ...activeRemarksModal, remarks: val })
                  setRecords(records.map(rec => rec.id === activeRemarksModal.id ? { ...rec, remarks: val } : rec))
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  boxSizing: 'border-box'
                }}
                placeholder="Remarks / Case chhan ziahna..."
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              {auth?.user?.username?.toLowerCase() !== 'mala' && (
                <button
                  onClick={() => {
                    handleRemarksBlur(activeRemarksModal.id, activeRemarksModal.remarks)
                    setActiveRemarksModal(null)
                  }}
                  style={{ padding: '8px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Save & Close
                </button>
              )}
              <button
                onClick={() => setActiveRemarksModal(null)}
                style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
