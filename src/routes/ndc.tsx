import React, { useState, useEffect, useRef, useContext } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AuthContext } from './__root'

export const Route = createFileRoute('/ndc')({
  component: NdcComponent,
})

interface NdcRecord {
  id: string
  dept: string
  refNo: string
  name: string
  desig: string
  office: string
  reason: string
  reasonVal: string
  retireDate: string
  rawRetireDate: string
  issueDate: string
  rawIssueDate: string
  date: string
  copy1Val: string
  ddoName: string
  sigName: string
  sigDesig: string
  showSd: boolean
  manualIssue: string
  created_by?: string
}

const DEPT_CODES: Record<string, string> = {
  "COOP": "14", "DC": "16", "DAT": "18", "DMR": "20", "DIET": "22",
  "ECS": "24", "EXE": "26", "EDN": "28", "ELCN": "30", "FOR": "32",
  "FCA": "34", "FISH": "36", "GHC": "38", "GAD": "40", "G&M": "42",
  "GOV": "44", "HTE": "46", "HSD": "48", "HME": "50", "IND": "52",
  "HOR": "54", "I&PR": "56", "ICT": "58", "IFSL": "60", "IRI": "62",
  "LRS": "64", "LAD": "66", "LAE": "68", "LGM": "70", "L&J": "72",
  "MLAS": "74", "MPSC": "76", "MRHG": "78", "MIC": "80", "POL": "82",
  "P&E": "84", "P&S": "86", "PWD": "88", "PHE": "90", "PRI": "92",
  "RD": "94", "SWD": "96", "SOIL": "98", "S&T": "100", "SAD": "102",
  "SYS": "104", "SERI": "106", "SPB": "108", "SIPMIU": "110", "SIN": "112",
  "TAX": "114", "TRP": "116", "TRM": "118", "T&C": "120", "UD&PA": "122",
  "VETY": "124", "ZSB": "126"
}

function NdcComponent() {
  const auth = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState<'generator' | 'list'>('generator')
  const [previewTab, setPreviewTab] = useState<'ndc' | 'notesheet'>('ndc')
  const [notesheetSide, setNotesheetSide] = useState<'front' | 'back'>('front')
  const [isNdcEditable, setIsNdcEditable] = useState(false)

  // Form State
  const [fileYear, setFileYear] = useState('2026')
  const [dept, setDept] = useState('')
  const [fileNo, setFileNo] = useState('114')
  const [refNo, setRefNo] = useState('G.26041/48/2026-CCA(L&M)/HSD/114')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [employeeName, setEmployeeName] = useState('')
  const [designation, setDesignation] = useState('IV Grade')
  const [office, setOffice] = useState('District Hospital, Champhai District, Champhai, Mizoram')
  const [reasonVal, setReasonVal] = useState('is due to <b>retire</b> on')
  const [pensionDate, setPensionDate] = useState(() => new Date().toISOString().split('T')[0])
  const [copy1Val, setCopy1Val] = useState('Director, Local Fund Audit & Pension, Accounts & Treasuries, Mizoram, Aizawl')
  const [ddoName, setDdoName] = useState('Director, Accounts & Treasuries, Mizoram, Aizawl')
  
  // Signatory State
  const [showSd, setShowSd] = useState(true)
  const [sigName, setSigName] = useState('THARA LUNGṬAU')
  const [sigDesig, setSigDesig] = useState('Joint Director (L&M)')

  // Database Records
  const [records, setRecords] = useState<NdcRecord[]>([])
  const [currentEditId, setCurrentEditId] = useState<string | null>(null)
  
  // Pagination & Filtering
  const [searchName, setSearchName] = useState('')
  const [searchDept, setSearchDept] = useState('')
  const [filterYear, setFilterYear] = useState('All')
  const [filterMonth, setFilterMonth] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Notesheet entries
  const [notesheetEntries, setNotesheetEntries] = useState<string[]>([])

  const ndcContentRef = useRef<HTMLDivElement>(null)

  // Fetch records
  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/ndc')
      if (res.ok) {
        const data = await res.json()
        setRecords(data)
      }
    } catch (err) {
      console.error('Error fetching records:', err)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  // Auto-generate reference number
  useEffect(() => {
    const deptStr = dept.trim().toUpperCase()
    let deptCode = DEPT_CODES[deptStr]
    if (!deptCode) {
      const match = refNo.match(/G\.26041\/([A-Za-z0-9_]+)\//)
      deptCode = match ? match[1] : 'XX'
    }
    const displayDept = deptStr || 'DEPT'
    const newRef = `G.26041/${deptCode}/${fileYear}-CCA(L&M)/${displayDept}/${fileNo}`
    setRefNo(newRef)
  }, [dept, fileYear, fileNo])

  const formatOfficialDate = (dateStr: string) => {
    if (!dateStr) return '...'
    const date = new Date(dateStr)
    const day = date.getDate()
    const year = date.getFullYear()
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const month = months[date.getMonth()]
    let suffix = 'th'
    if (day % 10 === 1 && day !== 11) suffix = 'st'
    else if (day % 10 === 2 && day !== 12) suffix = 'nd'
    else if (day % 10 === 3 && day !== 13) suffix = 'rd'
    
    return {
      __html: `${day}<sup>${suffix}</sup> ${month}, ${year}`
    }
  }

  const getReasonText = (val: string) => {
    const selectOptions: Record<string, string> = {
      'is due to <b>retire</b> on': 'Retire (Superannuation)',
      '<b>retired</b> on': 'Retired (Chawl tawh)',
      '<b>died</b> on': 'Died (Mitthi)',
      'is due to <b>retire</b> (<b>Voluntary</b>) on': 'Retire (Voluntary)',
      '<b>retired</b> (<b>Voluntary</b>) on': 'Retired (Voluntary)',
      '<b>resigned</b> on': 'Resigned (Bâng)'
    }
    return selectOptions[val] || 'Retire'
  }

  const handleRecordSubmit = async () => {
    if (!employeeName.trim()) {
      alert('Hming ziak rawh!')
      return
    }

    const newRecord: Partial<NdcRecord> = {
      dept: dept.toUpperCase(),
      refNo: refNo,
      name: employeeName.trim(),
      desig: designation,
      office: office,
      reason: getReasonText(reasonVal),
      reasonVal: reasonVal,
      retireDate: pensionDate,
      rawRetireDate: pensionDate,
      issueDate: issueDate,
      rawIssueDate: issueDate,
      date: pensionDate,
      copy1Val: copy1Val,
      ddoName: ddoName,
      sigName: sigName,
      sigDesig: sigDesig,
      showSd: showSd,
      manualIssue: ''
    }

    if (currentEditId) {
      newRecord.id = currentEditId
      const existing = records.find(r => r.id === currentEditId)
      if (existing) {
        newRecord.manualIssue = existing.manualIssue || ''
      }
    }

    try {
      const res = await fetch('/api/ndc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      })

      if (res.ok) {
        alert(currentEditId ? 'Record siamṭhat (Updated) a ni ta!' : 'Record vawn fel a ni ta! (Database-ah a lut e)')
        setCurrentEditId(null)
        clearForm(false)
        fetchRecords()
      } else {
        alert('Server database save load a hlawhchham.')
      }
    } catch (err) {
      console.error('Error saving record:', err)
    }
  }

  const handleDeleteRecord = async (id: string) => {
    if (confirm('He record hi i delete duh tak tak em?')) {
      try {
        const res = await fetch(`/api/ndc?id=${id}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          fetchRecords()
        }
      } catch (err) {
        console.error('Error deleting record:', err)
      }
    }
  }

  const handleEditRecord = (r: NdcRecord) => {
    setCurrentEditId(r.id)
    setDept(r.dept)
    setRefNo(r.refNo)
    setEmployeeName(r.name)
    setDesignation(r.desig)
    setOffice(r.office)
    setReasonVal(r.reasonVal || 'is due to <b>retire</b> on')
    setPensionDate(r.rawRetireDate || r.retireDate || '')
    setIssueDate(r.rawIssueDate || r.issueDate || '')
    setCopy1Val(r.copy1Val)
    setDdoName(r.ddoName)
    setSigName(r.sigName)
    setSigDesig(r.sigDesig)
    setShowSd(r.showSd)
    setActiveTab('generator')
  }

  const handleInlineUpdate = async (id: string, field: keyof NdcRecord, value: string) => {
    const existing = records.find(r => r.id === id)
    if (!existing) return

    const updated = {
      ...existing,
      [field]: value.trim()
    }

    try {
      await fetch('/api/ndc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      fetchRecords()
    } catch (err) {
      console.error('Error updating inline:', err)
    }
  }

  const clearForm = (withAlert = true) => {
    setDept('')
    setEmployeeName('')
    setDesignation('IV Grade')
    setOffice('District Hospital, Champhai District, Champhai, Mizoram')
    setReasonVal('is due to <b>retire</b> on')
    const today = new Date().toISOString().split('T')[0]
    setIssueDate(today)
    setPensionDate(today)
    setCurrentEditId(null)
    if (withAlert) {
      alert('Form tihruak a ni e.')
    }
  }

  const addToNotesheet = () => {
    if (!employeeName.trim()) {
      alert('Hming ziak rawh!')
      return
    }
    if (!pensionDate) {
      alert('Pension date thlang rawh!')
      return
    }

    const dObj = new Date(pensionDate)
    const dd = String(dObj.getDate()).padStart(2, '0')
    const mm = String(dObj.getMonth() + 1).padStart(2, '0')
    const yyyy = dObj.getFullYear()
    const shortDate = `${dd}.${mm}.${yyyy}`

    let reasonPhrase = 'who is due to retire on'
    if (reasonVal === 'is due to <b>retire</b> on') reasonPhrase = 'who is due to retire on'
    else if (reasonVal === '<b>retired</b> on') reasonPhrase = 'who retired on'
    else if (reasonVal === '<b>died</b> on') reasonPhrase = 'who died on'
    else if (reasonVal === 'is due to <b>retire</b> (<b>Voluntary</b>) on') reasonPhrase = 'who is due to retire (Voluntary) on'
    else if (reasonVal === '<b>retired</b> (<b>Voluntary</b>) on') reasonPhrase = 'who retired (Voluntary) on'
    else if (reasonVal === '<b>resigned</b> on') reasonPhrase = 'who resigned on'

    const template = `Received an application for the issue of a No Demand Certificate for ${employeeName.trim()}, ${designation}, ${reasonPhrase} ${shortDate}, from the ${ddoName}. The government servant has not availed any long-term loans. Therefore, a No Demand Certificate may be issued.`

    setNotesheetEntries([...notesheetEntries, template])
    setPreviewTab('notesheet')
    alert('Notesheet ah ziah luh a ni ta. Hnuai lam ah a rawn in-add thla zel ang.')
  }

  const deleteNoteEntry = (index: number) => {
    if (confirm('He paragraph hi i paih (delete) duh tak tak em?')) {
      setNotesheetEntries(notesheetEntries.filter((_, i) => i !== index))
    }
  }

  const editNoteEntry = (index: number, newText: string) => {
    const updated = [...notesheetEntries]
    updated[index] = newText
    setNotesheetEntries(updated)
  }

  const printDocument = (type: 'ndc' | 'notesheet') => {
    setPreviewTab(type)
    setTimeout(() => {
      const style = document.createElement('style')
      if (type === 'ndc') {
        style.innerHTML = `@media print { 
          @page { size: A4 portrait; margin: 0; } 
          #legal-page { display: none !important; } 
          #a4-page { display: block !important; } 
        }`
      } else {
        style.innerHTML = `@media print { 
          @page { size: legal portrait; margin: 0; } 
          #a4-page { display: none !important; } 
          #legal-page { display: block !important; } 
        }`
      }
      document.head.appendChild(style)
      window.print()
      document.head.removeChild(style)
    }, 100)
  }

  const exportToExcel = () => {
    if (records.length === 0) {
      alert('Record a la awm lo!')
      return
    }

    let csvContent = 'Sl.,Department,Name,Office,Date of retirement,Put up,Issue\n'
    records.forEach((r, index) => {
      const d = `"${(r.dept || '').replace(/"/g, '""')}"`
      const name = `"${(r.name || '').replace(/"/g, '""')}"`
      const combinedOffice = `${r.office || ''}\nMemo No.${r.refNo || ''}`
      const office = `"${combinedOffice.replace(/"/g, '""')}"`
      const retire = `"${(r.retireDate || r.date || '').replace(/"/g, '""')}"`
      const putUp = `"${(r.issueDate || '').replace(/"/g, '""')}"`
      const issueVal = `"${(r.manualIssue || '').replace(/"/g, '""')}"`
      csvContent += `${index + 1},${d},${name},${office},${retire},${putUp},${issueVal}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'NDC_Issue_List.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyTable = () => {
    const table = document.getElementById('logTable')
    if (!table) return

    const actionHeader = document.querySelector('#logTable th:last-child') as HTMLElement
    const actionCells = document.querySelectorAll('#logTable td:last-child')

    if (actionHeader) actionHeader.style.display = 'none'
    actionCells.forEach(cell => {
      if (cell) (cell as HTMLElement).style.display = 'none'
    })

    const range = document.createRange()
    range.selectNode(table)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)
    document.execCommand('copy')

    if (actionHeader) actionHeader.style.display = ''
    actionCells.forEach(cell => {
      if (cell) (cell as HTMLElement).style.display = ''
    })

    alert("Copy a ni ta! MS Word-ah i 'Paste' thei tawh ang.")
  }

  // Filter records
  const filteredRecords = records.filter(r => {
    const matchName = (r.name || '').toLowerCase().includes(searchName.toLowerCase())
    const matchDept = (r.dept || '').toLowerCase().includes(searchDept.toLowerCase())
    
    let matchDate = true
    if (filterYear !== 'All' || filterMonth !== 'All') {
      let recYear = ''
      let recMonth = ''
      
      if (r.rawIssueDate) {
        const parts = r.rawIssueDate.split('-')
        if (parts.length >= 2) {
          recYear = parts[0]
          recMonth = parts[1]
        }
      } else if (r.issueDate) {
        const match = r.issueDate.match(/(January|February|March|April|May|June|July|August|September|October|November|December),\s*(\d{4})/i)
        if (match) {
          recYear = match[2]
          const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ]
          const mIndex = months.findIndex(m => m.toLowerCase() === match[1].toLowerCase()) + 1
          recMonth = mIndex < 10 ? '0' + mIndex : '' + mIndex
        }
      }
      
      if (filterYear !== 'All' && recYear !== filterYear) matchDate = false
      if (filterMonth !== 'All' && recMonth !== filterMonth) matchDate = false
    }

    return matchName && matchDept && matchDate
  })

  // Years for filter
  const yearsForFilter = Array.from(new Set(
    records.map(r => {
      if (r.rawIssueDate) return r.rawIssueDate.split('-')[0]
      if (r.issueDate) {
        const match = r.issueDate.match(/(\d{4})/)
        return match ? match[1] : null
      }
      return null
    }).filter(Boolean) as string[]
  )).sort().reverse()

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="fade-in" style={{ padding: '20px 0' }}>
      <div className="tab-menu no-print" style={{
        maxWidth: '1400px',
        margin: '0 auto 15px auto',
        display: 'flex',
        gap: '10px',
        padding: '0 20px'
      }}>
        <button
          className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          NDC Generator
        </button>
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Issue List Database
        </button>
      </div>

      {activeTab === 'generator' && (
        <div className="generator-layout" style={{
          display: 'flex',
          gap: '20px',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 20px',
          alignItems: 'flex-start'
        }}>
          {/* Edit Panel */}
          <div className="edit-panel no-print" style={{
            background: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            flex: '0 0 650px',
            position: 'sticky',
            top: '20px',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ marginTop: 0, color: '#d32f2f', fontSize: '19px', textAlign: 'center' }}>
              NDC Generator
            </h2>
            
            <div className="panel-columns" style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
              <div className="panel-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="input-box" style={{
                  background: '#e8f5e9',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #81c784'
                }}>
                  <label style={{ color: '#2e7d32', marginBottom: '5px', display: 'block', fontSize: '13px', fontWeight: 'bold' }}>
                    1. File Year (A in-save reng ang)
                  </label>
                  <input
                    type="text"
                    value={fileYear}
                    onChange={(e) => setFileYear(e.target.value)}
                    style={{ borderColor: '#4caf50', fontWeight: 'bold', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                
                <div className="input-box">
                  <label>2. Department (Short Form)</label>
                  <input
                    type="text"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    placeholder="Entirnan: HSD, COOP, DC..."
                  />
                </div>

                <div className="input-box">
                  <label>3. Letter / File No. (Tawp ber ami)</label>
                  <input
                    type="text"
                    value={fileNo}
                    onChange={(e) => setFileNo(e.target.value)}
                    placeholder="Entirnan: 114"
                  />
                </div>

                <div className="input-box">
                  <label>4. Reference No. (Auto-Generated)</label>
                  <input
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                  />
                </div>

                <div className="input-box">
                  <label>5. Issue Date (Calendar)</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <div className="input-box">
                  <label>6. Employee Name</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Hming ziak rawh"
                  />
                </div>

                <div className="input-box">
                  <label>7. Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>

                <div className="input-box">
                  <label>8. Office / Department</label>
                  <input
                    type="text"
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="panel-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="input-box">
                  <label>9. Reason for NDC</label>
                  <select value={reasonVal} onChange={(e) => setReasonVal(e.target.value)}>
                    <option value="is due to <b>retire</b> on">Retire (Superannuation)</option>
                    <option value="<b>retired</b> on">Retired (Chawl tawh)</option>
                    <option value="<b>died</b> on">Died (Mitthi)</option>
                    <option value="is due to <b>retire</b> (<b>Voluntary</b>) on">Retire (Voluntary)</option>
                    <option value="<b>retired</b> (<b>Voluntary</b>) on">Retired (Voluntary)</option>
                    <option value="<b>resigned</b> on">Resigned (Bâng)</option>
                  </select>
                </div>

                <div className="input-box">
                  <label>10. Pension date</label>
                  <input
                    type="date"
                    value={pensionDate}
                    onChange={(e) => setPensionDate(e.target.value)}
                  />
                </div>

                <div className="input-box">
                  <label>11. Copy No. 1 (Authority)</label>
                  <select value={copy1Val} onChange={(e) => setCopy1Val(e.target.value)}>
                    <option value="Director, Local Fund Audit & Pension, Accounts & Treasuries, Mizoram, Aizawl">
                      Director, Local Fund Audit & Pension, Aizawl
                    </option>
                    <option value="Joint Director, A&T Southern Zone, Mizoram, Lunglei">
                      Joint Director, A&T Southern Zone, Mizoram, Lunglei
                    </option>
                    <option value="Joint Director (NPS), Office of the Chief Controller of Accounts, Accounts & Treasuries, Mizoram, Aizawl">
                      Joint Director (NPS), O/o CCA, A&T, Aizawl
                    </option>
                  </select>
                </div>

                <div className="input-box">
                  <label>12. DDO Designation (Copy No. 2)</label>
                  <input
                    type="text"
                    value={ddoName}
                    onChange={(e) => setDdoName(e.target.value)}
                  />
                </div>

                <div className="sig-edit-box" style={{
                  background: '#fff8f8',
                  padding: '15px',
                  borderRadius: '6px',
                  border: '1px solid #ffcdd2',
                  marginTop: '5px'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#d32f2f', borderBottom: '1px solid #ffcdd2', paddingBottom: '5px' }}>
                    Signatory Details
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: '#fff3f3', padding: '8px', borderRadius: '4px', border: '1px solid #ffcdd2' }}>
                    <input
                      type="checkbox"
                      id="inShowSd"
                      checked={showSd}
                      onChange={(e) => setShowSd(e.target.checked)}
                      style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }}
                    />
                    <label htmlFor="inShowSd" style={{ margin: 0, cursor: 'pointer', color: '#d32f2f', fontSize: '14px' }}>
                      "Sd/-" tih lanna
                    </label>
                  </div>
                  
                  <div className="input-box" style={{ marginBottom: '12px' }}>
                    <label>Signatory Name</label>
                    <input
                      type="text"
                      value={sigName}
                      onChange={(e) => setSigName(e.target.value)}
                    />
                  </div>
                  <div className="input-box">
                    <label>Signatory Designation</label>
                    <select value={sigDesig} onChange={(e) => setSigDesig(e.target.value)}>
                      <option value="Joint Director (L&M)">Joint Director (L&M)</option>
                      <option value="Deputy Director (L&M)">Deputy Director (L&M)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="btn-container" style={{
              marginTop: '20px',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'space-between'
            }}>
              <button className="btn btn-clear" onClick={() => clearForm(true)}>CLEAR FORM</button>
              <button className="btn btn-log" onClick={handleRecordSubmit}>
                {currentEditId ? 'UPDATE RECORD' : 'RECORD ONLY'}
              </button>
              <button className="btn btn-add-note" onClick={addToNotesheet}>ADD TO NOTESHEET</button>
              <button className="btn btn-print-ndc" onClick={() => printDocument('ndc')}>PRINT NDC</button>
              <button className="btn btn-print-note" onClick={() => printDocument('notesheet')}>PRINT NOTESHEET</button>
              <button className="btn btn-clear-note" onClick={() => {
                if (confirm('Notesheet a i thil ziah luh te thai chhiat vek i duh em?')) setNotesheetEntries([])
              }}>CLEAR NOTESHEET</button>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px', color: '#777', fontStyle: 'italic' }}>
              Created by : Lalmalsawmtluanga
            </div>
          </div>

          {/* Preview Section */}
          <div className="preview-section" style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowX: 'auto',
            paddingBottom: '20px'
          }}>
            <div className="preview-tabs no-print" style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '15px',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <button
                className={`prev-tab-btn ${previewTab === 'ndc' ? 'active' : ''}`}
                onClick={() => setPreviewTab('ndc')}
              >
                NDC Preview
              </button>
              <button
                className={`prev-tab-btn ${previewTab === 'notesheet' ? 'active' : ''}`}
                onClick={() => setPreviewTab('notesheet')}
              >
                Notesheet Preview
              </button>
              
              {previewTab === 'notesheet' && (
                <span id="note-side-controls" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginLeft: '15px',
                  paddingLeft: '15px',
                  borderLeft: '2px solid #ccc'
                }}>
                  <button
                    className={`side-btn ${notesheetSide === 'front' ? 'active' : ''}`}
                    onClick={() => setNotesheetSide('front')}
                  >
                    Front
                  </button>
                  <button
                    className={`side-btn ${notesheetSide === 'back' ? 'active' : ''}`}
                    onClick={() => setNotesheetSide('back')}
                  >
                    Back
                  </button>
                </span>
              )}
            </div>

            {/* NDC Preview Page */}
            <div
              id="a4-page"
              className="a4-page document-font"
              style={{ display: previewTab === 'ndc' ? 'block' : 'none' }}
            >
              <div className="ndc-page-actions no-print" style={{
                position: 'absolute', top: '15px', right: '15px', background: 'white',
                border: '1px solid #bcccdc', borderRadius: '4px', padding: '5px', zIndex: 50
              }}>
                <button
                  className="btn-ndc-edit"
                  style={{
                    background: isNdcEditable ? '#4caf50' : '#ff9800',
                    color: 'white', border: 'none', padding: '6px 12px',
                    borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold'
                  }}
                  onClick={() => setIsNdcEditable(!isNdcEditable)}
                >
                  {isNdcEditable ? '💾 Save Edit' : '✏️ Edit NDC Text'}
                </button>
              </div>
              
              <div
                className="inner-border"
                ref={ndcContentRef}
                contentEditable={isNdcEditable}
                suppressContentEditableWarning
                style={{
                  border: '4px double black',
                  height: '100%',
                  padding: '10px 35px 10px 35px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  backgroundColor: isNdcEditable ? '#f0f8ff' : 'transparent',
                  outline: isNdcEditable ? '2px dashed #1976d2' : 'none'
                }}
              >
                <img
                  src="https://industries.mizoram.gov.in/uploads/attachments/2024/10/b17faea85184a6955b7bb5c481426c65/bana-kaih-logo.jpg"
                  alt="Bana Kaih Logo"
                  style={{ position: 'absolute', top: '-75px', left: '-5px', height: '60px' }}
                />

                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/b/b4/Emblem_of_India_with_transparent_background.png"
                  alt="India Logo"
                  crossOrigin="anonymous"
                  style={{
                    position: 'absolute', top: '-5px', left: '50%', transform: 'translate(-50%, -50%)',
                    height: '50px', backgroundColor: 'white', padding: '0 10px'
                  }}
                />

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', lineHeight: 1.25, marginBottom: '10px', marginTop: '15px' }}>
                  GOVERNMENT OF MIZORAM<br />
                  OFFICE OF THE CHIEF CONTROLLER OF ACCOUNTS<br />
                  ACCOUNTS &amp; TREASURIES; MIZORAM: AIZAWL
                </div>

                <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                  <div style={{ display: 'inline-block', textAlign: 'left', fontSize: '16px', lineHeight: 1.3 }}>
                    No. <span>{refNo}</span><br />
                    Dated Aizawl, the <span dangerouslySetInnerHTML={formatOfficialDate(issueDate)}></span>.
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '21px', textDecoration: 'underline', marginBottom: '20px' }}>
                  NO DEMAND CERTIFICATE
                </div>

                <div style={{ textAlign: 'justify', textIndent: '40px', fontSize: '17px', lineHeight: 1.6, marginBottom: '10px' }}>
                  This is to certify that <span className="bold">{employeeName || '...'}</span>, <span className="bold">{designation}</span> under the Office of the{' '}
                  <span className="bold">{office}</span> <span dangerouslySetInnerHTML={{ __html: reasonVal }}></span>{' '}
                  <span className="bold" dangerouslySetInnerHTML={formatOfficialDate(pensionDate)}></span> has no liabilities on <span className="bold">HBA, Computer Advance, Motor Car Advance, Scooter Advance and Special Car Loan</span> as per records maintained by this office.
                </div>
                
                <div style={{ textAlign: 'justify', textIndent: '40px', fontSize: '17px', lineHeight: 1.6, marginBottom: '35px' }}>
                  Hence, No Demand Certificate in respect of <span className="bold">HBA, Computer Advance, Motor Car Advance, Scooter Advance and Special Car Loan</span> is hereby issued.
                </div>
                
                <div style={{ textAlign: 'right', marginBottom: '0px' }}>
                  <div style={{ display: 'inline-block', textAlign: 'center', minWidth: '250px', fontSize: '16px', lineHeight: 1.2 }}>
                    <div style={{ height: '35px', position: 'relative' }}>
                      {showSd && <span style={{ position: 'absolute', bottom: '3px', left: 0, right: 0, fontWeight: 'bold' }}>Sd/-</span>}
                    </div>
                    <span className="bold">{showSd ? sigName.toUpperCase() : `(${sigName.toUpperCase()})`}</span><br />
                    <span>{sigDesig}</span><br />
                    Accounts &amp; Treasuries<br />
                    Mizoram: Aizawl
                  </div>
                </div>

                <table style={{ width: '100%', fontSize: '16px', marginBottom: '5px', border: 'none', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'left', padding: 0, border: 'none' }}>Memo No. <span>{refNo}</span></td>
                      <td style={{ textAlign: 'right', padding: 0, border: 'none', whiteSpace: 'nowrap' }}>Dated Aizawl, the <span dangerouslySetInnerHTML={formatOfficialDate(issueDate)}></span>.</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontSize: '15px', marginBottom: '3px', fontStyle: 'italic' }}>Copy to:</div>
                
                <table style={{ width: 'calc(100% - 40px)', marginLeft: '40px', fontSize: '15px', lineHeight: 1.25, border: 'none', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '30px', verticalAlign: 'top', padding: 0, paddingBottom: '2px', border: 'none' }}>1.</td>
                      <td style={{ verticalAlign: 'top', padding: 0, paddingBottom: '2px', border: 'none' }}>
                        The <span className="bold">{copy1Val}</span> for information.
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: 0, paddingBottom: '2px', border: 'none' }}>2.</td>
                      <td style={{ verticalAlign: 'top', padding: 0, paddingBottom: '2px', border: 'none' }}>
                        The <span className="bold">{ddoName}</span>, for information and necessary action.
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: 0, border: 'none' }}>3.</td>
                      <td style={{ verticalAlign: 'top', padding: 0, border: 'none' }}>Person concerned for information.</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ textAlign: 'right', marginTop: '15px' }}>
                  <div style={{ display: 'inline-block', textAlign: 'center', minWidth: '250px', fontWeight: 'bold', fontSize: '16px' }}>
                    <div style={{ height: '40px' }}></div> <span>{sigDesig.toUpperCase()}</span>
                  </div>
                </div>

                <div style={{
                  position: 'absolute', bottom: '10px', left: '35px', right: '35px', textAlign: 'center',
                  borderTop: '1px solid black', paddingTop: '10px', fontSize: '11px', lineHeight: 1.4
                }}>
                  Contact : 0389-2343381/2347761(CCA) Fax-2342588/2343303(Director)/2345591(ELFA)/2345187[JD(A] 2345270 [JD(P)]/2345820 [DD(A)]/2340055[DD(E)]/ 2306221[DD(P)]/2345235[DD(F)]/2345825[AD(P)]/ 2356162 [Supdt.]
                </div>
              </div>
            </div>

            {/* Notesheet Preview Page */}
            <div
              id="legal-page"
              className={`note-sheet document-font ${notesheetSide === 'back' ? 'back-side' : ''}`}
              style={{ display: previewTab === 'notesheet' ? 'block' : 'none' }}
            >
              <div className="note-hline"></div>
              <div className="note-vline"></div>
              <div className="note-content-area" id="notesheet-content" style={{
                position: 'absolute', top: '96px', left: notesheetSide === 'front' ? '144px' : '40px',
                right: notesheetSide === 'front' ? '40px' : '96px', bottom: '40px',
                fontSize: '18px', lineHeight: 1.5, textAlign: 'justify', overflow: 'hidden'
              }}>
                {/* Handwriting lines area */}
                {notesheetEntries.length > 0 && (
                  <div id="letter-no-area" style={{ width: '100%', marginBottom: '20px' }}>
                    {notesheetEntries.map((_, i) => (
                      <div key={i} className="handwriting-line" style={{ height: '1cm', borderBottom: '1px solid #999', boxSizing: 'border-box' }}></div>
                    ))}
                  </div>
                )}
                
                {/* Notesheet entries */}
                <div id="notesheet-entries">
                  {notesheetEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="note-entry-wrapper"
                      style={{
                        position: 'relative', padding: '5px', marginLeft: '-5px', marginBottom: '20px',
                        border: '1px solid transparent', borderRadius: '4px', transition: 'all 0.2s'
                      }}
                    >
                      <div className="note-actions no-print" style={{
                        position: 'absolute', top: '-15px', right: '10px', background: 'white',
                        border: '1px solid #bcccdc', borderRadius: '4px', padding: '3px', display: 'flex', gap: '5px'
                      }}>
                        <button
                          className="btn-note-action btn-note-edit"
                          style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', border: 'none', borderRadius: '3px', color: 'white', fontWeight: 'bold', background: '#ff9800' }}
                          onClick={(e) => {
                            const btn = e.currentTarget
                            const textDiv = btn.closest('.note-entry-wrapper')?.querySelector('.note-entry-text') as HTMLDivElement
                            if (textDiv) {
                              textDiv.contentEditable = 'true'
                              textDiv.focus()
                              textDiv.addEventListener('blur', () => { textDiv.contentEditable = 'false' }, { once: true })
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-note-action btn-note-delete"
                          style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', border: 'none', borderRadius: '3px', color: 'white', fontWeight: 'bold', background: '#d32f2f' }}
                          onClick={() => deleteNoteEntry(idx)}
                        >
                          Delete
                        </button>
                      </div>
                      <div
                        className="note-entry-text"
                        style={{ outline: 'none', textIndent: '40px' }}
                        suppressContentEditableWarning
                        onBlur={(e) => editNoteEntry(idx, e.currentTarget.innerText)}
                      >
                        {entry}
                      </div>
                    </div>
                  ))}
                </div>
                
                {notesheetEntries.length > 0 && (
                  <div id="approval-text" style={{ marginTop: '10px', marginBottom: '20px', fontWeight: 'normal' }}>
                    Put up for your approval, please.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="record-section" style={{
          background: 'white', padding: '20px', maxWidth: '1400px', margin: '0 auto 20px auto',
          borderRadius: '8px', border: '1px solid #ccc', display: 'block'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#333' }}>NDC Issue List</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-excel" onClick={exportToExcel}>
                Export to Excel (CSV)
              </button>
              <button
                style={{ background: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={copyTable}
              >
                Copy for MS Word
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="filter-section" style={{
            background: '#f0f4f8', padding: '15px', borderRadius: '6px', border: '1px solid #d9e2ec',
            marginTop: '15px', marginBottom: '20px'
          }}>
            <div className="filter-grid" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="filter-item" style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '13px', color: '#334e68', marginBottom: '5px', fontWeight: 'bold' }}>🔍 Search by Name</label>
                <input type="text" placeholder="Hming chhu rawh..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
              </div>
              <div className="filter-item" style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '13px', color: '#334e68', marginBottom: '5px', fontWeight: 'bold' }}>🏢 Filter by Department</label>
                <input type="text" placeholder="Entirnan: HSD" value={searchDept} onChange={(e) => setSearchDept(e.target.value)} />
              </div>
              <div className="filter-item" style={{ flex: 0.5, minWidth: '120px', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '13px', color: '#334e68', marginBottom: '5px', fontWeight: 'bold' }}>📅 Year</label>
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  <option value="All">All Years</option>
                  {yearsForFilter.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="filter-item" style={{ flex: 0.5, minWidth: '120px', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '13px', color: '#334e68', marginBottom: '5px', fontWeight: 'bold' }}>📆 Month</label>
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                  <option value="All">All Months</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
            </div>
            <div className="case-counter" style={{ marginTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#243b53', borderTop: '1px dashed #bcccdc', paddingTop: '10px' }}>
              Total Cases: <span style={{ color: '#d32f2f', fontSize: '22px' }}>{filteredRecords.length}</span>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table id="logTable" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '18px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Dept</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Name</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Office</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Date of retirement</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Put up</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Issue</th>
                  {auth?.user?.role === 'admin' && (
                    <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Siamtu</th>
                  )}
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }} className="no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((r, idx) => {
                  const sl = (currentPage - 1) * itemsPerPage + idx + 1
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>{sl}</td>
                      <td
                        style={{ border: '1px solid #ddd', padding: '10px', fontWeight: 'bold', color: '#d32f2f', cursor: 'text' }}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleInlineUpdate(r.id, 'dept', e.currentTarget.innerText)}
                      >
                        {r.dept}
                      </td>
                      <td
                        style={{ border: '1px solid #ddd', padding: '10px', cursor: 'text', whiteSpace: 'nowrap' }}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleInlineUpdate(r.id, 'name', e.currentTarget.innerText)}
                      >
                        {r.name}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleInlineUpdate(r.id, 'office', e.currentTarget.innerText)}
                          style={{ cursor: 'text' }}
                        >
                          {r.office}
                        </div>
                        <div style={{ fontSize: '14px', color: '#1976d2', marginTop: '4px', fontStyle: 'italic' }}>
                          Memo No. {r.refNo}
                        </div>
                      </td>
                      <td
                        style={{ border: '1px solid #ddd', padding: '10px', cursor: 'text' }}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleInlineUpdate(r.id, 'retireDate', e.currentTarget.innerText)}
                      >
                        {r.retireDate}
                      </td>
                      <td
                        style={{ border: '1px solid #ddd', padding: '10px', cursor: 'text' }}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleInlineUpdate(r.id, 'issueDate', e.currentTarget.innerText)}
                      >
                        {r.issueDate}
                      </td>
                      <td
                        style={{ border: '1px solid #ddd', padding: '10px', cursor: 'text' }}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleInlineUpdate(r.id, 'manualIssue', e.currentTarget.innerText)}
                      >
                        {r.manualIssue}
                      </td>
                      {auth?.user?.role === 'admin' && (
                        <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '15px', color: '#555', fontWeight: 'bold' }}>
                          👤 {r.created_by || 'mala'}
                        </td>
                      )}
                      <td style={{ border: '1px solid #ddd', padding: '10px' }} className="no-print">
                        <div className="action-btns" style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn-edit"
                            style={{ background: '#ff9800', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                            onClick={() => handleEditRecord(r)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-delete"
                            style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                            onClick={() => handleDeleteRecord(r.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', marginTop: '20px' }}>
              <button
                className="page-btn"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .tab-btn {
          padding: 10px 20px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          border: none;
          border-radius: 4px;
          background: #ddd;
          color: #333;
          transition: var(--transition);
        }
        .tab-btn:hover {
          background: #ccc;
        }
        .tab-btn.active {
          background: #d32f2f;
          color: white;
        }
        .input-box {
          display: flex;
          flex-direction: column;
          margin-bottom: 12px;
        }
        .input-box label {
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #555;
        }
        .input-box input, .input-box select {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 15px;
          box-sizing: border-box;
          width: 100%;
        }
        .btn {
          border: none;
          padding: 10px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          flex: 1 1 30%;
          min-width: 130px;
          color: white;
          transition: var(--transition);
        }
        .btn:hover {
          opacity: 0.9;
        }
        .btn-clear { background: #ff9800; }
        .btn-log { background: #607d8b; }
        .btn-add-note { background: #8e24aa; }
        .btn-print-ndc { background: #2e7d32; }
        .btn-print-note { background: #0288d1; }
        .btn-clear-note { background: #d84315; }

        .prev-tab-btn {
          padding: 8px 16px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #eee;
          color: #333;
          transition: var(--transition);
        }
        .prev-tab-btn.active {
          background: #1976d2;
          color: white;
          border-color: #1976d2;
        }
        .side-btn {
          padding: 6px 14px;
          font-size: 14px;
          cursor: pointer;
          border: 1px solid #999;
          border-radius: 4px;
          background: white;
          font-weight: bold;
          transition: var(--transition);
        }
        .side-btn.active {
          background: #4caf50;
          color: white;
          border-color: #4caf50;
        }
        .btn-excel {
          background: #1976d2;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .page-btn {
          padding: 8px 12px;
          border: 1px solid #bcccdc;
          background: white;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
          font-weight: bold;
          color: #334e68;
        }
        .page-btn.active {
          background: #1976d2;
          color: white;
          border-color: #1976d2;
        }
        .page-btn:disabled {
          background: #e4e9f2;
          color: #9fb3c8;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
