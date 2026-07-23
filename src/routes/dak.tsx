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

const getCurrentMonthStr = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function DakComponent() {
  const auth = useContext(AuthContext)
  const [records, setRecords] = useState<DakRecord[]>([])
  const [users, setUsers] = useState<any[]>([])
  
  // Admin Form State
  const [assignTo, setAssignTo] = useState('')
  const [receiveNo, setReceiveNo] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [caseType, setCaseType] = useState('DC')
  
  // Filters
  const [filterMonth, setFilterMonth] = useState(getCurrentMonthStr)
  const [filterDate, setFilterDate] = useState('')
  const [searchName, setSearchName] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterStaff, setFilterStaff] = useState('All')
  
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
    updateRecord(id, { case_type: val })
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
          .col-sl { width: 40px !important; text-align: center !important; }
          .col-receive { width: 85px !important; }
          .col-name { white-space: normal !important; word-break: break-word !important; }
          .col-dept { white-space: normal !important; word-break: break-word !important; }
          .col-case, .col-amount, .col-action, .col-remarks, .col-issue { width: 80px !important; min-width: 80px !important; max-width: 80px !important; }
          .col-case, .col-amount, .col-action, .col-issue { text-align: center !important; }
          .col-remarks { text-align: left !important; white-space: normal !important; word-break: break-word !important; }
          
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ border: '1px solid #000' }}>
                  <th className="col-sl" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '40px' }}>Sl. No</th>
                  <th className="col-receive" style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '85px' }}>Receive No.</th>
                  <th className="col-name" style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Name</th>
                  <th className="col-dept" style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Department</th>
                  <th className="col-case" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '80px' }}>Case</th>
                  <th className="col-amount" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '80px' }}>Amount</th>
                  <th className="col-action" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '80px' }}>Action</th>
                  <th className="col-remarks" style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '80px' }}>Remarks</th>
                  <th className="col-issue" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '80px' }}>Issue</th>
                  {auth?.user?.role === 'admin' && (
                    <th className="no-print" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {groupedRecords[key].map(r => (
                  <tr key={r.id} style={{ border: '1px solid #000' }}>
                    <td className="col-sl" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{r.sl_no}.</td>
                    <td className="col-receive" style={{ border: '1px solid #000', padding: '8px' }}>{r.receive_no}</td>
                    <td className="col-name" style={{ border: '1px solid #000', padding: '8px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.name}</td>
                    <td className="col-dept" style={{ border: '1px solid #000', padding: '8px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.department}</td>
                    
                    <td className="col-case" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                      {auth?.user?.username?.toLowerCase() === 'mala' ? (
                        r.case_type
                      ) : (
                        <select value={r.case_type} onChange={e => handleCaseTypeChange(r.id, e.target.value)} style={{ padding: '4px', border: 'none', background: 'transparent' }}>
                          <option value="DC">DC</option>
                          <option value="NDC">NDC</option>
                          <option value="Challan">Challan</option>
                          <option value="Others">Others</option>
                        </select>
                      )}
                    </td>

                    <td className="col-amount" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                      {auth?.user?.username?.toLowerCase() === 'mala' ? (
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
                          style={{ width: '65px', padding: '4px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px' }}
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
                        r.action
                      ) : (
                        <select value={r.action} onChange={e => handleActionChange(r.id, e.target.value)} style={{ padding: '4px', border: 'none', background: 'transparent', fontWeight: 'bold', width: '100%', color: 'inherit' }}>
                          <option value="Pending" style={{color: 'black'}}>Pending</option>
                          <option value="Processing" style={{color: 'black'}}>Processing</option>
                          <option value="Settled" style={{color: 'black'}}>Settled</option>
                        </select>
                      )}
                    </td>

                    <td className="col-remarks" style={{ border: '1px solid #000', padding: '4px', textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {auth?.user?.username?.toLowerCase() === 'mala' ? (
                        <span style={{ fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.remarks || ''}</span>
                      ) : (
                        <textarea
                          rows={1}
                          value={r.remarks || ''}
                          onChange={(e) => {
                            const newRemarks = e.target.value
                            setRecords(records.map(rec => rec.id === r.id ? { ...rec, remarks: newRemarks } : rec))
                          }}
                          onBlur={(e) => handleRemarksBlur(r.id, e.target.value)}
                          style={{
                            width: '100%',
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
                          placeholder="Remarks / Reason"
                        />
                      )}
                    </td>

                    <td className="col-issue" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                      {auth?.user?.username?.toLowerCase() === 'mala' ? (
                        r.issue_date
                      ) : (
                        <input 
                          type="text" 
                          defaultValue={r.issue_date} 
                          onBlur={e => handleIssueDateBlur(r.id, e.target.value)}
                          style={{ width: '70px', padding: '4px', border: '1px solid #ccc', textAlign: 'center' }}
                        />
                      )}
                    </td>

                    {auth?.user?.role === 'admin' && (
                      <td className="no-print" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                        <button onClick={() => handleDelete(r.id)} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
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
    </div>
  )
}
