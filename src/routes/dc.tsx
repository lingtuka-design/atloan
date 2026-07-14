import React, { useState, useEffect, useContext } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AuthContext } from './__root'

export const Route = createFileRoute('/dc')({
  component: DcComponent,
})

interface LoanInput {
  inLoanType: string
  inSanction: string
  inCode: string
  inAmount: string
  inInterestRate: string
  inDrawalDate1: string
  inDrawnAmount1: string
  inDrawalDate2: string
  inDrawnAmount2: string
  inDrawalDate3: string
  inDrawnAmount3: string
  inNoOfInstalment: string
  inInstalment: string
  inIntNoOfInstalment: string
  inIntInstalment: string
  inIntLastInstalment: string
  inStartMonth: string
  inRecoveredInterest: string
}

interface SharedInputs {
  inName: string
  inDesig: string
  inOffice: string
  inDDOOffice: string
  inRetireLabel: string
  inRetireDate: string
  inThawnnaTur: string
  inDDOAddress: string
  inMemoYear: string
  inMemoDept: string
  inMemoVol: string
  inMemoPage: string
  inIssueDate: string
  inSigName: string
  inSigDesig: string
  inShowSd: boolean
}

interface CalculatedRow {
  month: string
  paidAmt: number
  recoveryAmt: number
  principalAtEnd: number
  instlNo: number | null
}

interface CalculatedLoan {
  idx: number
  loanType: string
  loanNameFull: string
  code: string
  standardEmi: number
  targetInstalments: number
  intRate: number
  recoveredInt: number
  calcData: CalculatedRow[]
}

interface DcRecord {
  id: string
  name: string
  dept: string
  type: string
  dateSaved: string
  issueDate: string
  sharedInputs: SharedInputs
  loanInputsArray: LoanInput[]
  allCalculatedData: CalculatedLoan[]
  noteHTMLSaved: string
  legalCertHTMLSaved: string
  ndcCertHTMLSaved: string
  created_by?: string
}

const LOAN_TYPES: Record<string, string> = {
  "HBA": "House Building Advance",
  "SA": "Scooter Advance",
  "MCA": "Motor Car Advance",
  "COM": "Computer Advance",
  "SCL": "Special Car Loan"
}

const HEADS_OF_ACCOUNT = {
  PRINCIPAL: {
    "HBA": "761000201000000",
    "SA": "761000203000000",
    "MCA": "761000202000000",
    "COM": "761000204000000",
    "SCL": "761000203000000",
    "Other conveyance": "761000203000000"
  } as Record<string, string>,
  INTEREST: {
    "HBA": "004904800010100",
    "SA": "004904800010300",
    "MCA": "004904800010200",
    "COM": "004904800010400",
    "SCL": "004904800010300",
    "Other conveyance": "004904800010300"
  } as Record<string, string>
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

function DcComponent() {
  const auth = useContext(AuthContext)
  const [activeMainTab, setActiveMainTab] = useState<'generator' | 'list'>('generator')
  const [previewTab, setPreviewTab] = useState<'calc' | 'note' | 'cert'>('calc')
  const [notesheetSide, setNotesheetSide] = useState<'front' | 'back'>('front')
  const [activeLoanFormTab, setActiveLoanFormTab] = useState(0)

  // Shared Inputs
  const [shared, setShared] = useState<SharedInputs>({
    inName: '',
    inDesig: '',
    inOffice: '',
    inDDOOffice: '',
    inRetireLabel: 'Date of Retirement',
    inRetireDate: new Date().toISOString().split('T')[0],
    inThawnnaTur: 'Director, Local Fund Audit & Pension, Accounts & Treasuries, Mizoram, Aizawl',
    inDDOAddress: '',
    inMemoYear: '2025',
    inMemoDept: 'HSD',
    inMemoVol: '',
    inMemoPage: '',
    inIssueDate: new Date().toISOString().split('T')[0],
    inSigName: 'THARA LUNGṬAU',
    inSigDesig: 'Joint Director (L&M)',
    inShowSd: false
  })

  // Loan Forms Input List
  const [loans, setLoans] = useState<LoanInput[]>([createEmptyLoan('HBA')])

  // Calculation outputs
  const [calculatedData, setCalculatedData] = useState<CalculatedLoan[]>([])
  const [currentEditId, setCurrentEditId] = useState<string | null>(null)
  const [savedNoteHTML, setSavedNoteHTML] = useState<string | null>(null)

  // Database Records
  const [records, setRecords] = useState<DcRecord[]>([])
  
  // Search & Filter
  const [searchName, setSearchName] = useState('')
  const [searchDept, setSearchDept] = useState('')
  const [filterCreator, setFilterCreator] = useState('All')

  function createEmptyLoan(type: string): LoanInput {
    const today = new Date().toISOString().split('T')[0]
    return {
      inLoanType: type,
      inSanction: '',
      inCode: type,
      inAmount: '0',
      inInterestRate: '7.5',
      inDrawalDate1: today.substring(0, 7),
      inDrawnAmount1: '0',
      inDrawalDate2: '',
      inDrawnAmount2: '0',
      inDrawalDate3: '',
      inDrawnAmount3: '0',
      inNoOfInstalment: '120',
      inInstalment: '0',
      inIntNoOfInstalment: '10',
      inIntInstalment: '',
      inIntLastInstalment: '',
      inStartMonth: today.substring(0, 7),
      inRecoveredInterest: '0'
    }
  }

  // Fetch records
  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/dc')
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

  const fmtAmt = (num: number | string) => {
    return Number(num).toLocaleString('en-IN')
  }

  const parseAmt = (str: string) => {
    return parseFloat(str.replace(/,/g, '')) || 0
  }

  const numToWordsStrict = (num: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    function inWords(n: number): string {
      if (n < 20) return ones[n]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '')
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '')
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '')
      return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '')
    }

    if (num === 0) return 'Zero'
    return inWords(Math.floor(num))
  }

  const amountToWords = (amount: number) => {
    const absAmt = Math.abs(amount)
    const words = numToWordsStrict(absAmt)
    if (amount < 0) {
      return `Rupees ${words} only (Excess Refundable)`
    }
    return `Rupees ${words} only`
  }

  const formatDrawalMonthStr = (dateStr: string) => {
    if (!dateStr) return '...'
    const d = new Date(dateStr)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]}, ${d.getFullYear()}`
  }

  const formatMonthYear = (date: Date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const formatDotDate = (dateStr: string) => {
    if (!dateStr) return '...'
    const d = new Date(dateStr)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}.${mm}.${yyyy}`
  }

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return '...'
    const date = new Date(dateStr)
    const day = date.getDate()
    const year = date.getFullYear()
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    let suffix = 'th'
    if (day % 10 === 1 && day !== 11) suffix = 'st'
    else if (day % 10 === 2 && day !== 12) suffix = 'nd'
    else if (day % 10 === 3 && day !== 13) suffix = 'rd'
    return { __html: `${day}<sup>${suffix}</sup> ${months[date.getMonth()]}, ${year}` }
  }

  const addLoanForm = () => {
    if (loans.length >= 5) {
      alert('Advance item 5 aia tam thun belh theih a ni lo.')
      return
    }
    const typesAvailable = Object.keys(LOAN_TYPES).filter(t => !loans.some(l => l.inLoanType === t))
    const type = typesAvailable.length > 0 ? typesAvailable[0] : 'HBA'
    setLoans([...loans, createEmptyLoan(type)])
    setActiveLoanFormTab(loans.length)
  }

  const removeLoanForm = (idx: number) => {
    if (loans.length === 1) return
    const filtered = loans.filter((_, i) => i !== idx)
    setLoans(filtered)
    setActiveLoanFormTab(0)
  }

  const handleLoanFieldChange = (idx: number, field: keyof LoanInput, value: string) => {
    const updated = [...loans]
    updated[idx] = {
      ...updated[idx],
      [field]: value
    }
    setLoans(updated)
  }

  const handleSharedChange = (field: keyof SharedInputs, value: any) => {
    setShared(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Calculate Auto EMI (like the legacy page logic: SanctionAmount / 120 or recovery installments)
  const calculateAutoEMI = (idx: number) => {
    const updated = [...loans]
    const amount = parseFloat(updated[idx].inAmount) || 0
    const inst = parseInt(updated[idx].inNoOfInstalment) || 120
    if (amount > 0 && inst > 0) {
      updated[idx].inInstalment = String(Math.ceil(amount / inst))
    }
    setLoans(updated)
  }

  const generateAllCalculations = () => {
    let hasError = false
    const results: CalculatedLoan[] = []

    loans.forEach((loan, idx) => {
      const standardEmi = parseFloat(loan.inInstalment) || 0
      const targetInstalments = parseInt(loan.inNoOfInstalment) || 120
      const startMonth = loan.inStartMonth
      const intRate = parseFloat(loan.inInterestRate) || 0
      const recoveredInt = parseFloat(loan.inRecoveredInterest) || 0

      const drawalsArray = []
      if (loan.inDrawalDate1 && parseFloat(loan.inDrawnAmount1) > 0) {
        drawalsArray.push({ date: new Date(loan.inDrawalDate1), amount: parseFloat(loan.inDrawnAmount1) })
      }
      if (loan.inDrawalDate2 && parseFloat(loan.inDrawnAmount2) > 0) {
        drawalsArray.push({ date: new Date(loan.inDrawalDate2), amount: parseFloat(loan.inDrawnAmount2) })
      }
      if (loan.inDrawalDate3 && parseFloat(loan.inDrawnAmount3) > 0) {
        drawalsArray.push({ date: new Date(loan.inDrawalDate3), amount: parseFloat(loan.inDrawnAmount3) })
      }

      if (drawalsArray.length === 0 || !startMonth) {
        alert(`Loan (Index ${idx + 1}): Drawal Month leh Recovery Start Month thun kim rawh.`)
        hasError = true
        return
      }

      drawalsArray.sort((a, b) => a.date.getTime() - b.date.getTime())

      const getDrawal = (dateObj: Date) => {
        let total = 0
        for (const d of drawalsArray) {
          if (d.date.getMonth() === dateObj.getMonth() && d.date.getFullYear() === dateObj.getFullYear()) {
            total += d.amount
          }
        }
        return total
      }

      const currD = new Date(drawalsArray[0].date)
      const recovDate = new Date(startMonth + '-01')
      const calcData: CalculatedRow[] = []
      let currPrincipal = 0

      while (currD.getTime() < recovDate.getTime()) {
        const drawnThisMonth = getDrawal(currD)
        currPrincipal += drawnThisMonth
        calcData.push({
          month: currD.toISOString(),
          paidAmt: drawnThisMonth,
          recoveryAmt: 0,
          principalAtEnd: currPrincipal,
          instlNo: null
        })
        currD.setMonth(currD.getMonth() + 1)
      }

      for (let instCount = 1; instCount <= targetInstalments; instCount++) {
        const drawnThisMonth = getDrawal(currD)
        currPrincipal += drawnThisMonth
        let rec = 0
        if (instCount === targetInstalments) {
          rec = currPrincipal > 0 ? currPrincipal : 0
        } else {
          rec = currPrincipal > 0 ? Math.min(currPrincipal, standardEmi) : 0
        }
        currPrincipal -= rec
        calcData.push({
          month: currD.toISOString(),
          paidAmt: drawnThisMonth,
          recoveryAmt: rec,
          principalAtEnd: currPrincipal,
          instlNo: instCount
        })
        currD.setMonth(currD.getMonth() + 1)
      }

      // Populate Interest proposed plan
      const totalIBB = calcData.reduce((acc, row) => acc + Math.max(0, row.principalAtEnd), 0)
      const calculatedInterest = (totalIBB * intRate) / 1200
      const roundedInterest = Math.round(calculatedInterest)
      const intNoOfInst = parseInt(loan.inIntNoOfInstalment) || 10

      let calculatedIntEmi = ''
      let calculatedLastIntEmi = ''

      if (roundedInterest > 0 && intNoOfInst > 0) {
        if (intNoOfInst === 1) {
          calculatedLastIntEmi = String(roundedInterest)
          calculatedIntEmi = ''
        } else {
          const calcEqualInstCount = intNoOfInst - 1
          let parsedIntEmi = Math.round(roundedInterest / intNoOfInst)
          if (roundedInterest - parsedIntEmi * calcEqualInstCount <= 0) {
            parsedIntEmi = Math.floor(roundedInterest / intNoOfInst)
          }
          calculatedIntEmi = String(parsedIntEmi)
          calculatedLastIntEmi = String(roundedInterest - parsedIntEmi * calcEqualInstCount)
        }
      }

      // Update input object with auto EMIs if empty
      loan.inIntInstalment = loan.inIntInstalment || calculatedIntEmi
      loan.inIntLastInstalment = loan.inIntLastInstalment || calculatedLastIntEmi

      results.push({
        idx: idx,
        loanType: loan.inLoanType,
        loanNameFull: LOAN_TYPES[loan.inLoanType] || loan.inLoanType,
        code: loan.inCode,
        standardEmi: standardEmi,
        targetInstalments: targetInstalments,
        intRate: intRate,
        recoveredInt: recoveredInt,
        calcData: calcData
      })
    })

    if (!hasError) {
      setCalculatedData(results)
      setPreviewTab('calc')
    }
  }

  const handleCellEdit = (loanIdx: number, rowIndex: number, newValue: string) => {
    let newRecAmt = parseFloat(newValue.replace(/,/g, '')) || 0
    if (isNaN(newRecAmt) || newRecAmt < 0) newRecAmt = 0

    const updated = [...calculatedData]
    const loanObj = updated.find(l => l.idx === loanIdx)
    if (!loanObj) return

    loanObj.calcData[rowIndex].recoveryAmt = newRecAmt

    let prevPrincipal = rowIndex === 0 ? 0 : loanObj.calcData[rowIndex - 1].principalAtEnd
    let currPrincipal = prevPrincipal

    for (let i = rowIndex; i < loanObj.calcData.length; i++) {
      const row = loanObj.calcData[i]
      currPrincipal += row.paidAmt
      if (row.instlNo !== null) {
        currPrincipal -= row.recoveryAmt
        row.principalAtEnd = currPrincipal
      } else {
        row.principalAtEnd = currPrincipal
      }
    }
    setCalculatedData(updated)
  }

  // Parse pronouns and action wording
  const getWordingStats = () => {
    const name = shared.inName.trim() || '...'
    const desig = shared.inDesig.trim()
    const office = shared.inOffice.trim() || '...'
    const ddoOffice = shared.inDDOOffice.trim() || '...'
    const retireLabel = shared.inRetireLabel
    const retireDateRaw = shared.inRetireDate
    const ddo = shared.inDDOAddress.trim() || '...'

    // Memo No. Assembly
    const mYear = shared.inMemoYear || '2025'
    const mDept = shared.inMemoDept || 'HSD'
    const mVol = shared.inMemoVol.trim()
    const mPage = shared.inMemoPage || '...'
    const mCode = DEPT_CODES[mDept] || '00'
    const mVolStr = mVol ? `-${mVol}` : ''
    const fullMemo = `No.G. 26041/${mCode}/${mYear}-CCA(L&M)/${mDept}${mVolStr}/${mPage}`

    const copy2Address = ddo !== '...' ? ddo : '...'

    const cleanName = name.split(',')[0]
    const nLower = cleanName.toLowerCase()
    let pronoun = 'he/she'
    let posPronoun = 'His/Her'
    if (nLower.startsWith('pi ')) {
      pronoun = 'she'
      posPronoun = 'Her'
    } else if (nLower.startsWith('pu ')) {
      pronoun = 'he'
      posPronoun = 'His'
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const retDate = retireDateRaw ? new Date(retireDateRaw) : null
    const isPast = retDate && retDate < today

    let actionText = 'who is due to retire on'
    let statusWord = 'retiring'

    if (retireLabel === 'Date of Expiry') {
      actionText = 'who died on'
      statusWord = 'deceased'
    } else if (retireLabel === 'Date of Resignation') {
      actionText = 'who resigned on'
      statusWord = 'resigned'
    } else if (retireLabel === 'Date of Retirement (Vol)') {
      if (isPast) {
        actionText = 'who retired (voluntarily) on'
        statusWord = 'retired'
      } else {
        actionText = 'who is due to retire (voluntarily) on'
        statusWord = 'retiring'
      }
    } else {
      if (isPast) {
        actionText = 'who retired on'
        statusWord = 'retired'
      } else {
        actionText = 'who is due to retire on'
        statusWord = 'retiring'
      }
    }

    // Outstanding stats
    let grandTotalOutstandingPrincipal = 0
    let grandTotalOutstandingInterest = 0
    let grandTotalOutstandingPositive = 0
    let totalExcessAmount = 0
    let excessDetails: string[] = []
    let loansWithLiability = new Set<string>()
    let takenTypes = new Set<string>()
    let prinHeadsToShow = new Set<string>()
    let intHeadsToShow = new Set<string>()
    let ndcLoanStrings: string[] = []
    let ndcCodeStrings: string[] = []

    calculatedData.forEach((loan) => {
      takenTypes.add(loan.loanType)
      let totalIBB = 0
      loan.calcData.forEach(row => {
        totalIBB += Math.max(0, row.principalAtEnd)
      })

      const calculatedInterest = (totalIBB * loan.intRate) / 1200
      const roundedInterest = Math.round(calculatedInterest)
      const trueOutstandingInterest = roundedInterest - loan.recoveredInt

      const outstandingPrincipal = loan.calcData.length > 0 ? loan.calcData[loan.calcData.length - 1].principalAtEnd : 0
      const totalOutstanding = outstandingPrincipal + trueOutstandingInterest

      // NDC String Prep
      const sancAmt = loans[loan.idx]?.inAmount || '0'
      const sanction = loans[loan.idx]?.inSanction || '...'
      const sancAmtStr = fmtAmt(sancAmt)
      const rawWords = numToWordsStrict(parseAmt(sancAmt))
      ndcLoanStrings.push(`${loan.loanType} amounting to ₹ ${sancAmtStr}/- Rupees (${rawWords}) only. Vide No ${sanction}`)
      ndcCodeStrings.push(loan.code)

      if (totalOutstanding > 0) {
        grandTotalOutstandingPositive += totalOutstanding
        loansWithLiability.add(loan.loanType)
      } else if (totalOutstanding < 0) {
        const absExcess = Math.abs(totalOutstanding)
        totalExcessAmount += absExcess
        if (outstandingPrincipal < 0 && trueOutstandingInterest < 0) {
          excessDetails.push(`excess recovery of ${loan.loanType} principal & interest amounting <span class="bold">Rs. ${fmtAmt(absExcess)}/-</span>`)
        } else if (outstandingPrincipal < 0) {
          excessDetails.push(`excess recovery of ${loan.loanType} principal amounting <span class="bold">Rs. ${fmtAmt(absExcess)}/-</span>`)
        } else if (trueOutstandingInterest < 0) {
          excessDetails.push(`excess recovery of ${loan.loanType} interest amounting <span class="bold">Rs. ${fmtAmt(absExcess)}/-</span>`)
        }
      }

      const headCategory = loan.loanType
      if (outstandingPrincipal > 0) prinHeadsToShow.add(headCategory)
      if (trueOutstandingInterest > 0) intHeadsToShow.add(headCategory)

      grandTotalOutstandingPrincipal += outstandingPrincipal
      grandTotalOutstandingInterest += trueOutstandingInterest
    })

    const isGlobalNDC = calculatedData.length > 0 && loansWithLiability.size === 0

    return {
      fullName: name + (desig !== '' ? ', ' + desig : ''),
      cleanName,
      office,
      ddoOffice,
      copy2Address,
      pronoun,
      posPronoun,
      actionText,
      statusWord,
      fullMemo,
      mDept,
      mYear,
      mVolStr,
      mPage,
      mCode,
      ddo,
      grandTotalOutstandingPrincipal,
      grandTotalOutstandingInterest,
      grandTotalOutstandingPositive,
      totalExcessAmount,
      excessDetails,
      loansWithLiability,
      takenTypes,
      prinHeadsToShow,
      intHeadsToShow,
      isGlobalNDC,
      ndcLoanStrings,
      ndcCodeStrings
    }
  }

  const w = getWordingStats()

  const handleSaveRecord = async () => {
    if (!shared.inName.trim()) {
      alert('Khawngaihin a hming (Name) tal hi thun lut phawt rawh.')
      return
    }
    if (calculatedData.length === 0) {
      alert("Record save hmain 'GENERATE CALCULATION' hi hmet phawt rawh le.")
      return
    }

    const typesSumm = Array.from(new Set(calculatedData.map(l => l.loanType))).join(', ')
    const recordPayload: Partial<DcRecord> = {
      name: shared.inName.trim(),
      dept: shared.inMemoDept,
      type: `${typesSumm} (${loans.length})`,
      dateSaved: new Date().toLocaleDateString('en-IN'),
      issueDate: shared.inIssueDate,
      sharedInputs: shared,
      loanInputsArray: loans,
      allCalculatedData: calculatedData,
      noteHTMLSaved: document.getElementById('editable-note-wrapper')?.innerHTML || '',
      legalCertHTMLSaved: '',
      ndcCertHTMLSaved: ''
    }

    if (currentEditId) {
      recordPayload.id = currentEditId
    }

    try {
      const res = await fetch('/api/dc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordPayload)
      })

      if (res.ok) {
        const result = await res.json()
        setCurrentEditId(result.id)
        alert('I calculation data leh Notesheet hi save a ni ta e.')
        fetchRecords()
      } else {
        alert('Error saving record to database.')
      }
    } catch (err) {
      console.error('Error saving:', err)
    }
  }

  const handleLoadRecord = (r: DcRecord) => {
    setCurrentEditId(r.id)
    setShared({
      ...r.sharedInputs,
      inShowSd: Boolean(r.sharedInputs.inShowSd)
    })
    setLoans(r.loanInputsArray)
    setCalculatedData(r.allCalculatedData)
    setSavedNoteHTML(r.noteHTMLSaved || null)
    setActiveMainTab('generator')
  }

  const handleDeleteRecord = async (id: string) => {
    if (confirm('He record hi i delete duh tak tak em?')) {
      try {
        const res = await fetch(`/api/dc?id=${id}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          fetchRecords()
          if (currentEditId === id) {
            clearFormAndReset(false)
          }
        }
      } catch (err) {
        console.error('Error deleting:', err)
      }
    }
  }

  const clearFormAndReset = (withAlert = true) => {
    setShared({
      inName: '',
      inDesig: '',
      inOffice: '',
      inDDOOffice: '',
      inRetireLabel: 'Date of Retirement',
      inRetireDate: new Date().toISOString().split('T')[0],
      inThawnnaTur: 'Director, Local Fund Audit & Pension, Accounts & Treasuries, Mizoram, Aizawl',
      inDDOAddress: '',
      inMemoYear: '2025',
      inMemoDept: 'HSD',
      inMemoVol: '',
      inMemoPage: '',
      inIssueDate: new Date().toISOString().split('T')[0],
      inSigName: 'THARA LUNGṬAU',
      inSigDesig: 'Joint Director (L&M)',
      inShowSd: false
    })
    setLoans([createEmptyLoan('HBA')])
    setCalculatedData([])
    setCurrentEditId(null)
    setSavedNoteHTML(null)
    setActiveLoanFormTab(0)
    if (withAlert) {
      alert('Form tihruak a ni e.')
    }
  }

  const printDocument = (type: 'calc' | 'note' | 'cert') => {
    setPreviewTab(type)
    setTimeout(() => {
      const style = document.createElement('style')
      if (type === 'cert' && w.isGlobalNDC) {
        style.innerHTML = `@media print { 
          @page { size: A4 portrait; margin: 0; } 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tab-menu, .edit-panel, .preview-tabs, .record-section { display: none !important; }
          #legal-pages-container, #note-pages-container { display: none !important; }
          #ndc-cert-page { display: block !important; } 
          .cert-page { display: block !important; padding: 60px 70px !important; margin: 0 !important; box-shadow: none !important; border: none !important; min-height: auto !important; }
        }`
      } else if (type === 'cert') {
        style.innerHTML = `@media print { 
          @page { size: legal portrait; margin: 0; } 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tab-menu, .edit-panel, .preview-tabs, .record-section { display: none !important; }
          #legal-pages-container, #note-pages-container { display: none !important; }
          #legal-cert-page { display: block !important; } 
          .cert-page { display: block !important; padding: 60px 70px !important; margin: 0 !important; box-shadow: none !important; border: none !important; min-height: auto !important; }
        }`
      } else if (type === 'note') {
        style.innerHTML = `@media print { 
          @page { size: legal portrait; margin: 0; } 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tab-menu, .edit-panel, .preview-tabs, .record-section { display: none !important; }
          #legal-pages-container, #ndc-cert-page, #legal-cert-page { display: none !important; }
          #note-pages-container { display: flex !important; flex-direction: column !important; width: 100% !important; }
          .note-sheet { padding: 0 !important; margin: 0 !important; page-break-after: always; box-shadow: none !important; border: none !important; width: 100% !important; position: relative !important; }
          .note-horizontal-line { position: absolute !important; top: 2cm !important; left: 0 !important; right: 0 !important; height: 1.5px !important; background-color: #777 !important; display: block !important; }
          .note-content-wrapper { padding-top: 1.5cm !important; margin-top: 2cm !important; min-height: calc(100vh - 2cm) !important; box-sizing: border-box !important; border-top: none !important; outline: none !important; }
          .note-left-line { margin-left: 2cm !important; margin-right: 2cm !important; border-left: 1.5px solid #60a5fa !important; border-right: none !important; padding-left: 10mm !important; padding-right: 5mm !important; }
          .note-right-line { margin-right: 2cm !important; margin-left: 2cm !important; border-right: 1.5px solid #60a5fa !important; border-left: none !important; padding-right: 10mm !important; padding-left: 5mm !important; }
        }`
      } else {
        style.innerHTML = `@media print { 
          @page { size: legal portrait; margin: 15mm 15mm 20mm 15mm; } 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tab-menu, .edit-panel, .preview-tabs, .record-section { display: none !important; }
          #note-pages-container, #ndc-cert-page, #legal-cert-page { display: none !important; }
          #legal-pages-container { display: block !important; }
          .legal-sheet { padding: 0 0 10mm 0 !important; margin: 0 0 15mm 0 !important; page-break-after: always; box-shadow: none !important; border: none !important; min-height: auto !important; box-sizing: border-box !important; }
        }`
      }
      document.head.appendChild(style)
      window.print()
      window.addEventListener('afterprint', () => {
        try {
          document.head.removeChild(style)
        } catch (e) {
          console.error(e)
        }
      }, { once: true })
    }, 100)
  }

  // Filter records
  const filteredRecords = records.filter(r => {
    const matchName = (r.name || '').toLowerCase().includes(searchName.toLowerCase())
    const matchDept = (r.dept || '').toLowerCase().includes(searchDept.toLowerCase())
    const matchCreator = filterCreator === 'All' || r.created_by === filterCreator
    return matchName && matchDept && matchCreator
  })

  const creatorsForFilter = Array.from(new Set(
    records.filter(r => r.created_by).map(r => r.created_by)
  )).sort()

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
          className={`tab-btn ${activeMainTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('generator')}
        >
          Loan Generator
        </button>
        <button
          className={`tab-btn ${activeMainTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('list')}
        >
          Case Records
        </button>
      </div>

      {activeMainTab === 'generator' && (
        <div className="generator-layout" style={{
          display: 'flex',
          gap: '20px',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 20px',
          alignItems: 'flex-start'
        }}>
          {/* Form input panel */}
          <div className="edit-panel no-print" style={{
            background: 'white',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            flex: '0 0 470px',
            position: 'sticky',
            top: '20px',
            boxSizing: 'border-box',
            maxHeight: '95vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '5px', color: '#1976d2', textAlign: 'center', fontSize: '24px' }}>
              Govt. Loan Tool
            </h2>
            <div style={{ textAlign: 'center', fontStyle: 'italic', color: '#555', marginBottom: '15px', fontSize: '12px', fontWeight: 'bold' }}>
              Created by Lalmalsawmtluanga
            </div>

            {/* Shared Fields */}
            <h3 className="section-title">Personal Details (Shared)</h3>
            <div className="input-box">
              <label>Name</label>
              <input type="text" value={shared.inName} onChange={e => handleSharedChange('inName', e.target.value)} placeholder="e.g. Pi R. Lalparlawmi" />
            </div>
            <div className="input-box">
              <label>Designation</label>
              <input type="text" value={shared.inDesig} onChange={e => handleSharedChange('inDesig', e.target.value)} placeholder="e.g. Senior Nursing Officer" />
            </div>
            <div className="input-box">
              <label>Office / Department</label>
              <input type="text" value={shared.inOffice} onChange={e => handleSharedChange('inOffice', e.target.value)} placeholder="e.g. Civil Hospital, Aizawl" />
            </div>
            <div className="input-box">
              <label>Event Type & Date</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <select value={shared.inRetireLabel} onChange={e => handleSharedChange('inRetireLabel', e.target.value)} style={{ flex: 1.2 }}>
                  <option value="Date of Retirement">Date of Retirement</option>
                  <option value="Date of Expiry">Date of Expiry</option>
                  <option value="Date of Resignation">Date of Resignation</option>
                  <option value="Date of Retirement (Vol)">Date of Retirement (Vol)</option>
                </select>
                <input type="date" value={shared.inRetireDate} onChange={e => handleSharedChange('inRetireDate', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>

            {/* Advance Tab Forms */}
            <div id="loan-tabs-container" className="loan-tabs-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px', marginTop: '15px' }}>
              {loans.map((loan, idx) => (
                <button
                  key={idx}
                  className={`loan-tab ${activeLoanFormTab === idx ? 'active' : ''}`}
                  onClick={() => setActiveLoanFormTab(idx)}
                >
                  {loan.inLoanType}
                </button>
              ))}
            </div>

            {loans.map((loan, idx) => (
              <div key={idx} className={`loan-container ${activeLoanFormTab === idx ? 'active' : ''}`}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-box" style={{ flex: 1 }}>
                    <label>Loan Type</label>
                    <select value={loan.inLoanType} onChange={e => handleLoanFieldChange(idx, 'inLoanType', e.target.value)}>
                      <option value="HBA">HBA (House Building)</option>
                      <option value="SA">SA (Scooter Advance)</option>
                      <option value="MCA">MCA (Motor Car)</option>
                      <option value="COM">COM (Computer)</option>
                      <option value="SCL">SCL (Special Car)</option>
                    </select>
                  </div>
                  <div className="input-box" style={{ flex: 2 }}><label>Code No.</label><input type="text" value={loan.inCode} onChange={e => handleLoanFieldChange(idx, 'inCode', e.target.value)} placeholder="e.g. HBA/HME/127" /></div>
                </div>
                
                <div className="input-box"><label>Sanction Order No. &amp; Date</label><input type="text" value={loan.inSanction} onChange={e => handleLoanFieldChange(idx, 'inSanction', e.target.value)} placeholder="e.g. G.26028/1/2010-DHME 16.9.2010" /></div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-box" style={{ flex: 1 }}><label>Sanctioned Amount (₹)</label><input type="number" value={loan.inAmount} onChange={e => handleLoanFieldChange(idx, 'inAmount', e.target.value)} placeholder="150000" onBlur={() => calculateAutoEMI(idx)} /></div>
                  <div className="input-box" style={{ flex: 1 }}><label>Rate of Interest (%)</label><input type="number" step="0.1" value={loan.inInterestRate} onChange={e => handleLoanFieldChange(idx, 'inInterestRate', e.target.value)} placeholder="6.5" /></div>
                </div>

                <h4 style={{ marginBottom: '5px', fontSize: '14px', color: '#555', fontWeight: 'bold' }}>Drawal Details (Instalments)</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-box" style={{ flex: 1 }}><label>1st Drawal Month</label><input type="month" value={loan.inDrawalDate1} onChange={e => handleLoanFieldChange(idx, 'inDrawalDate1', e.target.value)} /></div>
                  <div className="input-box" style={{ flex: 1 }}><label>1st Amount (₹)</label><input type="number" value={loan.inDrawnAmount1} onChange={e => handleLoanFieldChange(idx, 'inDrawnAmount1', e.target.value)} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-box" style={{ flex: 1 }}><label>2nd Drawal Month</label><input type="month" value={loan.inDrawalDate2} onChange={e => handleLoanFieldChange(idx, 'inDrawalDate2', e.target.value)} /></div>
                  <div className="input-box" style={{ flex: 1 }}><label>2nd Amount (₹)</label><input type="number" value={loan.inDrawnAmount2} onChange={e => handleLoanFieldChange(idx, 'inDrawnAmount2', e.target.value)} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-box" style={{ flex: 1 }}><label>3rd Drawal Month</label><input type="month" value={loan.inDrawalDate3} onChange={e => handleLoanFieldChange(idx, 'inDrawalDate3', e.target.value)} /></div>
                  <div className="input-box" style={{ flex: 1 }}><label>3rd Amount (₹)</label><input type="number" value={loan.inDrawnAmount3} onChange={e => handleLoanFieldChange(idx, 'inDrawnAmount3', e.target.value)} /></div>
                </div>

                <h4 style={{ marginBottom: '5px', fontSize: '14px', color: '#555', fontWeight: 'bold' }}>Recovery Details</h4>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-box" style={{ flex: 1 }}><label>Principal Instl. (Max)</label><input type="number" value={loan.inNoOfInstalment} onChange={e => handleLoanFieldChange(idx, 'inNoOfInstalment', e.target.value)} onBlur={() => calculateAutoEMI(idx)} /></div>
                  <div className="input-box" style={{ flex: 1 }}><label>Principal Monthly (₹)</label><input type="number" value={loan.inInstalment} onChange={e => handleLoanFieldChange(idx, 'inInstalment', e.target.value)} placeholder="1250" /></div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-box" style={{ flex: 1 }}><label>Recovery Start Month</label><input type="month" value={loan.inStartMonth} onChange={e => handleLoanFieldChange(idx, 'inStartMonth', e.target.value)} /></div>
                  <div className="input-box" style={{ flex: 1 }}><label>Int. Already Paid (₹)</label><input type="number" value={loan.inRecoveredInterest} onChange={e => handleLoanFieldChange(idx, 'inRecoveredInterest', e.target.value)} /></div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-box" style={{ flex: 1 }}><label>Interest Instl.</label><input type="number" value={loan.inIntNoOfInstalment} onChange={e => handleLoanFieldChange(idx, 'inIntNoOfInstalment', e.target.value)} /></div>
                  <div className="input-box" style={{ flex: 1 }}><label>Int. Monthly (₹)</label><input type="number" value={loan.inIntInstalment} onChange={e => handleLoanFieldChange(idx, 'inIntInstalment', e.target.value)} placeholder="Auto" /></div>
                  <div className="input-box" style={{ flex: 1 }}><label>Int. Last (₹)</label><input type="number" value={loan.inIntLastInstalment} onChange={e => handleLoanFieldChange(idx, 'inIntLastInstalment', e.target.value)} placeholder="Auto" /></div>
                </div>

                {loans.length > 1 && (
                  <div style={{ marginTop: '15px' }}>
                    <button
                      onClick={() => removeLoanForm(idx)}
                      style={{ width: '100%', background: '#d32f2f', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                    >
                      🗑️ REMOVE THIS LOAN
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button className="btn btn-add-loan" onClick={addLoanForm}>➕ ADD ANOTHER LOAN</button>

            <h3 className="section-title">Certificate & Signatory Details</h3>
            <div className="input-box">
              <label>Thawnna tur Address</label>
              <select value={shared.inThawnnaTur} onChange={e => handleSharedChange('inThawnnaTur', e.target.value)}>
                <option value="Director, Local Fund Audit & Pension, Accounts & Treasuries, Mizoram, Aizawl">1. Director, Local Fund Audit & Pension, Accounts & Treasuries, Mizoram, Aizawl</option>
                <option value="Joint Director, A&T Southern Zone, Mizoram, Lunglei">2. Joint Director, A&T Southern Zone, Mizoram, Lunglei</option>
                <option value="Joint Director (NPS), Office of the Chief Controller of Accounts, Accounts & Treasuries, Mizoram, Aizawl">3. Joint Director (NPS), Office of the Chief Controller of Accounts, Accounts & Treasuries, Mizoram, Aizawl</option>
              </select>
            </div>
            <div className="input-box">
              <label>DDO Office (Certificate-a lan dan tur)</label>
              <input type="text" value={shared.inDDOOffice} onChange={e => handleSharedChange('inDDOOffice', e.target.value)} placeholder="e.g. Senior Medical Superintendent, Civil Hospital, Aizawl" />
            </div>
            <div className="input-box">
              <label>DDO Address (Copy to No. 2)</label>
              <input type="text" value={shared.inDDOAddress} onChange={e => handleSharedChange('inDDOAddress', e.target.value)} placeholder="e.g. Senior Medical Superintendent, Civil Hospital, Aizawl" />
            </div>

            <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #90caf9' }}>
              <label style={{ color: '#1565c0', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>Memo No. Auto-Generator</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="input-box" style={{ flex: 1.5, marginBottom: 0 }}>
                  <label style={{ fontSize: '11px' }}>Department</label>
                  <select value={shared.inMemoDept} onChange={e => handleSharedChange('inMemoDept', e.target.value)} style={{ padding: '6px' }}>
                    {Object.keys(DEPT_CODES).map(k => (
                      <option key={k} value={k}>{k} ({DEPT_CODES[k]})</option>
                    ))}
                  </select>
                </div>
                <div className="input-box" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '11px' }}>Year</label>
                  <input type="number" value={shared.inMemoYear} onChange={e => handleSharedChange('inMemoYear', e.target.value)} style={{ padding: '6px' }} />
                </div>
                <div className="input-box" style={{ flex: 0.8, marginBottom: 0 }}>
                  <label style={{ fontSize: '11px' }}>Vol</label>
                  <input type="text" value={shared.inMemoVol} onChange={e => handleSharedChange('inMemoVol', e.target.value)} placeholder="(Optional)" style={{ padding: '6px' }} />
                </div>
                <div className="input-box" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '11px' }}>Page No.</label>
                  <input type="text" value={shared.inMemoPage} onChange={e => handleSharedChange('inMemoPage', e.target.value)} placeholder="e.g. 32" style={{ padding: '6px' }} />
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 'bold', color: '#333', textAlign: 'center' }}>
                Preview: <span style={{ color: '#d32f2f' }}>{w.fullMemo}</span>
              </div>
            </div>

            <div className="input-box">
              <label>Issue Date</label>
              <input type="date" value={shared.inIssueDate} onChange={e => handleSharedChange('inIssueDate', e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="input-box" style={{ flex: 1 }}>
                <label>Signatory Name</label>
                <input type="text" value={shared.inSigName} onChange={e => handleSharedChange('inSigName', e.target.value)} />
              </div>
              <div className="input-box" style={{ flex: 1 }}>
                <label>Signatory Designation</label>
                <input type="text" value={shared.inSigDesig} onChange={e => handleSharedChange('inSigDesig', e.target.value)} />
              </div>
            </div>

            <div className="input-box" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: '15px', background: '#e8f5e9', padding: '10px', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
              <input type="checkbox" id="inShowSd" checked={shared.inShowSd} onChange={e => handleSharedChange('inShowSd', e.target.checked)} />
              <label htmlFor="inShowSd" style={{ margin: 0, cursor: 'pointer', color: '#2e7d32' }}>
                Certificate-ah <strong>"Sd/-"</strong> tarlangin, hminga bracket () paih rawh
              </label>
            </div>

            <div className="btn-container">
              <button className="btn btn-calc" onClick={generateAllCalculations}>⚙️ GENERATE CALCULATION</button>
              <div style={{ width: '100%', textAlign: 'center', fontSize: '12px', color: '#d32f2f', marginBottom: '10px', fontWeight: 'bold' }}>
                Note: Table ami 'Recovery' zat hi i click in i edit thee a, a dang zawng a in-adjust vek ang.
              </div>
              
              <button className="btn btn-save" onClick={handleSaveRecord}>
                {currentEditId ? '🔄 UPDATE RECORD' : '💾 SAVE RECORD'}
              </button>
              
              <button className="btn btn-export" onClick={() => {
                if (calculatedData.length === 0) { alert('Record save hmain calculation i neih phawt a ngai.'); return; }
                let csv = 'Instl. No.,Month & Year,Drawn Principal,Recovery,Principal Outstanding\n'
                calculatedData.forEach(loan => {
                  csv += `\n${loan.loanNameFull} (${loan.loanType}) calculation\n`
                  loan.calcData.forEach(row => {
                    csv += `${row.instlNo || ''},"${formatMonthYear(new Date(row.month))}",${row.paidAmt > 0 ? row.paidAmt : ''},${row.recoveryAmt > 0 ? row.recoveryAmt : ''},${row.principalAtEnd}\n`
                  })
                })
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                const url = URL.createObjectURL(blob)
                link.setAttribute('href', url)
                link.setAttribute('download', `Loan_Calculations_${shared.inName}.csv`)
                link.style.visibility = 'hidden'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}>
                📥 EXPORT CALC TO EXCEL
              </button>
              
              <button className="btn btn-print-calc" onClick={() => {
                printDocument('calc')
              }}>🖨️ Print Calc Sheets</button>
              <button className="btn btn-print-cert" onClick={() => {
                printDocument('cert')
              }}>🖨️ Print Certificate</button>
              <button className="btn btn-print-note" onClick={() => {
                printDocument('note')
              }}>🖨️ Print Notesheet</button>
              
              <button className="btn btn-clear" onClick={() => clearFormAndReset(true)}>✨ NEW / CLEAR ALL</button>
            </div>
          </div>

          {/* Preview panel */}
          <div className="preview-section">
            <div className="preview-tabs no-print">
              <button className={`prev-tab-btn ${previewTab === 'calc' ? 'active' : ''}`} onClick={() => setPreviewTab('calc')}>
                Calculation Sheets (Legal)
              </button>
              <button className={`prev-tab-btn ${previewTab === 'cert' ? 'active' : ''}`} onClick={() => setPreviewTab('cert')}>
                {w.isGlobalNDC ? 'No Demand Certificate (A4)' : 'Demand Certificate (Legal)'}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button className={`prev-tab-btn ${previewTab === 'note' ? 'active' : ''}`} onClick={() => setPreviewTab('note')}>
                  Notesheet (Legal)
                </button>
                <div style={{ display: 'flex', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', height: '100%' }}>
                  <button className={`note-page-toggle ${notesheetSide === 'front' ? 'active' : ''}`} onClick={() => setNotesheetSide('front')} title="Front Page" style={{ borderRight: '1px solid #ccc' }}>L</button>
                  <button className={`note-page-toggle ${notesheetSide === 'back' ? 'active' : ''}`} onClick={() => setNotesheetSide('back')} title="Back Page">R</button>
                </div>
              </div>
            </div>

            {/* CALCULATION SHEET PREVIEW */}
            {previewTab === 'calc' && (
              <div id="legal-pages-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {calculatedData.length === 0 ? (
                  <div className="legal-sheet" style={{ display: 'flex', justifyContent: 'center', alignParagraphs: 'center', color: '#777', height: '100%', minHeight: '400px' }}>
                    <h3 style={{ margin: 'auto' }}>Loan Details thun la, "Generate Calculation" hmet rawh le.</h3>
                  </div>
                ) : (
                  calculatedData.map((loan, lIdx) => {
                    const input = loans[loan.idx] || loan
                    const totalIBB = loan.calcData.reduce((acc, row) => acc + Math.max(0, row.principalAtEnd), 0)
                    const totalRecovery = loan.calcData.reduce((acc, row) => acc + row.recoveryAmt, 0)
                    const totalPaid = loan.calcData.reduce((acc, row) => acc + row.paidAmt, 0)

                    const calculatedInterest = (totalIBB * loan.intRate) / 1200
                    const roundedInterest = Math.round(calculatedInterest)
                    const trueOutstandingInterest = roundedInterest - loan.recoveredInt
                    const outstandingPrincipal = loan.calcData.length > 0 ? loan.calcData[loan.calcData.length - 1].principalAtEnd : 0
                    const totalOutstanding = outstandingPrincipal + trueOutstandingInterest

                    // proposed EMI text
                    const pNum = loan.targetInstalments - 1 > 0 ? loan.targetInstalments - 1 : '....'
                    const pEmi = fmtAmt(loan.standardEmi)
                    const recRows = loan.calcData.filter(r => r.instlNo !== null)
                    const pLastEmi = recRows.length > 0 ? fmtAmt(recRows[recRows.length - 1].recoveryAmt) : '....'

                    let intEmi = '....', equalInstCount = '....', lastIntEmi = '....'
                    const intNoOfInst = parseInt(input.inIntNoOfInstalment) || 0
                    if (roundedInterest > 0 && intNoOfInst > 0) {
                      if (intNoOfInst === 1) {
                        lastIntEmi = fmtAmt(roundedInterest)
                      } else {
                        equalInstCount = String(intNoOfInst - 1)
                        intEmi = fmtAmt(parseFloat(input.inIntInstalment) || 0)
                        lastIntEmi = fmtAmt(parseFloat(input.inIntLastInstalment) || 0)
                      }
                    }

                    const d1HTML = (input.inDrawnAmount1 && input.inDrawalDate1) ? `Rs. ${fmtAmt(input.inDrawnAmount1)}</td><td style="font-style: italic;">${formatDrawalMonthStr(input.inDrawalDate1)}` : `....</td><td>....`
                    const d2Row = (parseFloat(input.inDrawnAmount2) > 0 && input.inDrawalDate2) ? `<tr><td style="text-align: left;">(B) 2nd Instalment</td><td style="font-style: italic;">Rs. ${fmtAmt(input.inDrawnAmount2)}</td><td style="font-style: italic;">${formatDrawalMonthStr(input.inDrawalDate2)}</td></tr>` : ''
                    const d3Row = (parseFloat(input.inDrawnAmount3) > 0 && input.inDrawalDate3) ? `<tr><td style="text-align: left;">(C) 3rd Instalment</td><td style="font-style: italic;">Rs. ${fmtAmt(input.inDrawnAmount3)}</td><td style="font-style: italic;">${formatDrawalMonthStr(input.inDrawalDate3)}</td></tr>` : ''

                    const prinLabel = outstandingPrincipal < 0 ? 'Principal Excess Recovery' : 'Principal Outstanding Balance'
                    const prinVal = fmtAmt(Math.abs(outstandingPrincipal))
                    const extIntHTML = trueOutstandingInterest < 0 ? (
                      <tr style={{ color: '#1976d2' }}>
                        <td style={{ textAlign: 'right', paddingRight: '15px' }}>Excess Recovery of Interest</td>
                        <td style={{ textAlign: 'center' }}>:</td>
                        <td style={{ textAlign: 'center' }}>₹</td>
                        <td style={{ textAlign: 'left', paddingLeft: '8px' }}>{fmtAmt(Math.abs(trueOutstandingInterest))}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td style={{ textAlign: 'right', paddingRight: '15px' }}>Outstanding Balance</td>
                        <td style={{ textAlign: 'center' }}>:</td>
                        <td style={{ textAlign: 'center' }}>₹</td>
                        <td style={{ textAlign: 'left', paddingLeft: '8px' }}>{fmtAmt(trueOutstandingInterest)}</td>
                      </tr>
                    )
                    const totalLabel = totalOutstanding < 0 ? 'Total Excess (Refundable)' : 'Total Outstanding Balance'

                    return (
                      <div key={lIdx} className="legal-sheet document-font">
                        <table className="header-box-table">
                          <tbody>
                            <tr><td colSpan={2} className="header-box-title">LONG-TERM LOAN CALCULATION<br />{loan.loanNameFull}</td></tr>
                            <tr>
                              <td className="header-left-col">
                                <table className="inner-info-table">
                                  <tbody>
                                    <tr><td className="label">Name &amp; Designation</td><td className="colon">:</td><td className="bold"><span>{w.fullName}</span></td></tr>
                                    <tr><td className="label">Name of Office:</td><td className="colon"></td><td className="bold"><span>{w.office}</span></td></tr>
                                    <tr><td className="label">Name of Loan</td><td className="colon">:</td><td className="bold">{loan.loanType}</td></tr>
                                    <tr><td className="label">Code No.</td><td className="colon">:</td><td className="bold">{loan.code}</td></tr>
                                    <tr><td className="label">Amount Sanctioned</td><td className="colon">:</td><td className="bold">Rs. {fmtAmt(input.inAmount)}</td></tr>
                                    <tr><td className="label">Sanction No. &amp; Date</td><td className="colon">:</td><td className="bold">{input.inSanction}</td></tr>
                                  </tbody>
                                </table>
                                <div style={{ marginTop: '15px', fontWeight: 'normal' }}>Date &amp; amount of drawal of Loan/Adv.</div>
                                <table style={{ width: '100%', textAlign: 'center', marginTop: '5px', borderCollapse: 'collapse' }}>
                                  <tbody>
                                    <tr><td style={{ textAlign: 'left', width: '40%' }}></td><td style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Amount</td><td style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Date</td></tr>
                                    <tr dangerouslySetInnerHTML={{ __html: `<td style="text-align: left;">(A) 1st Instalment</td><td style="font-style: italic;">${d1HTML}</td>` }}></tr>
                                    <tr dangerouslySetInnerHTML={{ __html: `${d2Row} ${d3Row}` }}></tr>
                                    <tr><td style={{ textalign: 'left' }}>Additional</td><td></td><td></td></tr>
                                  </tbody>
                                </table>
                              </td>
                              <td className="header-right-col">
                                <table className="inner-info-table">
                                  <tbody>
                                    <tr><td className="label" style={{ width: '170px' }}><span>{shared.inRetireLabel}</span></td><td className="colon">:</td><td className="val bold" style={{ textAlign: 'right' }}><span>{formatDotDate(shared.inRetireDate)}</span></td></tr>
                                    <tr><td className="label" style={{ width: '170px' }}>Rate of Interest</td><td className="colon">:</td><td className="val bold" style={{ textAlign: 'right' }}>{loan.intRate}%</td></tr>
                                    <tr><td className="label" style={{ width: '170px' }}>Total amount of Interest</td><td className="colon">:</td><td className="val bold" style={{ textAlign: 'right' }}>{fmtAmt(roundedInterest)}</td></tr>
                                  </tbody>
                                </table>
                                <div style={{ marginTop: '15px' }}>Rate of Recovery with No. of Instalments :</div>
                                <div style={{ marginTop: '5px', lineHeight: 1.5 }}>
                                  (a) Principal @ ₹ <span className="bold">{pEmi}</span> in <span className="bold">{pNum}</span> instalments and<br />
                                  <span style={{ display: 'inline-block', width: '85px' }}></span>@ ₹ <span className="bold">{pLastEmi}</span> in the last instalment.<br />
                                  (b) Interest &nbsp;&nbsp;@ ₹ <span className="bold">{intEmi}</span> in <span className="bold">{equalInstCount}</span> instalments and<br />
                                  <span style={{ display: 'inline-block', width: '85px' }}></span>@ ₹ <span className="bold">{lastIntEmi}</span> in the last instalment.
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <table className="calc-table">
                          <thead>
                            <tr><th width="10%">No. of<br />Instl.</th><th width="20%">Month &amp; Year</th><th width="20%">Paid (Drawal)</th><th width="15%">Recovery</th><th width="20%">IBB</th><th width="15%">Remarks</th></tr>
                          </thead>
                          <tbody>
                            {loan.calcData.map((row, rIdx) => (
                              <tr key={rIdx}>
                                <td>{row.instlNo || ''}</td>
                                <td>{formatMonthYear(new Date(row.month))}</td>
                                <td style={{ color: '#d32f2f', fontWeight: 'bold' }}>{row.paidAmt > 0 ? 'Rs. ' + fmtAmt(row.paidAmt) : ''}</td>
                                {row.instlNo !== null ? (
                                  <td
                                    className="editable-cell"
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => handleCellEdit(loan.idx, rIdx, e.currentTarget.innerText)}
                                  >
                                    {row.recoveryAmt > 0 ? fmtAmt(row.recoveryAmt) : ''}
                                  </td>
                                ) : (
                                  <td></td>
                                )}
                                <td>{fmtAmt(row.principalAtEnd)}</td>
                                <td></td>
                              </tr>
                            ))}
                            <tr style={{ fontWeight: 'bold' }}>
                              <td colSpan={2} className="text-right bold" style={{ fontSize: '15px' }}>Total :</td>
                              <td className="bold">{fmtAmt(totalPaid)}</td>
                              <td className="bold">{fmtAmt(totalRecovery)}</td>
                              <td className="bold">{fmtAmt(totalIBB)}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>

                        <div style={{ pageBreakInside: 'avoid' }}>
                          <div style={{ fontStyle: 'italic', fontWeight: 'bold', marginTop: '15px', fontSize: '15px' }}>Rate of Interest : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {loan.intRate}%</div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '15px', fontWeight: 'bold', fontSize: '15px' }}>
                            <div style={{ fontStyle: 'italic', marginRight: '15px', marginTop: '5px' }}>Interest = </div>
                            <div style={{ textAlign: 'center', marginRight: '20px' }}>
                              <div style={{ borderBottom: '1px solid black', padding: '0 15px 2px 15px' }}>Prog. Total &nbsp;&nbsp;&nbsp;&nbsp;x&nbsp;&nbsp;&nbsp;&nbsp; Rate of Interest</div>
                              <div style={{ paddingTop: '2px' }}>12</div>
                            </div>
                            <div style={{ marginRight: '20px', marginTop: '5px' }}> i.e </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <div style={{ textAlign: 'center', width: '100%' }}>
                                <div style={{ borderBottom: '1px solid black', padding: '0 25px 2px 25px' }}>{fmtAmt(totalIBB)} &nbsp;&nbsp;&nbsp;&nbsp;x&nbsp;&nbsp;&nbsp;&nbsp; {loan.intRate}%</div>
                                <div style={{ paddingTop: '2px' }}>1200</div>
                              </div>
                              <div style={{ marginTop: '10px', marginRight: '15px' }}>= Rs. {fmtAmt(calculatedInterest.toFixed(2))}</div>
                              <div style={{ marginTop: '5px', marginRight: '15px' }}>Say : Rs. {fmtAmt(roundedInterest)}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                            <table style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '15px', lineHeight: '1.6', border: 'none', borderCollapse: 'collapse' }}>
                              <tbody>
                                <tr>
                                  <td style={{ textAlign: 'right', paddingRight: '15px' }}>{prinLabel}</td>
                                  <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                                  <td style={{ width: '25px', textAlign: 'center' }}>₹</td>
                                  <td style={{ textAlign: 'left', paddingLeft: '8px', minWidth: '70px' }}>{prinVal}</td>
                                </tr>
                                <tr>
                                  <td style={{ textAlign: 'right', paddingRight: '15px' }}>Interest Accrued</td>
                                  <td style={{ textAlign: 'center' }}>:</td>
                                  <td style={{ textAlign: 'center' }}>₹</td>
                                  <td style={{ textAlign: 'left', paddingLeft: '8px' }}>{fmtAmt(roundedInterest)}</td>
                                </tr>
                                <tr>
                                  <td style={{ textAlign: 'right', paddingRight: '15px' }}>Interest already recovered</td>
                                  <td style={{ textAlign: 'center' }}>:</td>
                                  <td style={{ textAlign: 'center' }}>₹</td>
                                  <td style={{ textAlign: 'left', paddingLeft: '8px' }}>{fmtAmt(loan.recoveredInt)}</td>
                                </tr>
                                {extIntHTML}
                                <tr>
                                  <td style={{ textAlign: 'right', paddingRight: '15px' }}>{totalLabel}</td>
                                  <td style={{ textAlign: 'center' }}>:</td>
                                  <td style={{ textAlign: 'center' }}>₹</td>
                                  <td style={{ textAlign: 'left', paddingLeft: '8px' }}>{fmtAmt(Math.abs(totalOutstanding))}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="text-right" style={{ marginTop: '30px' }}>
                            <div style={{ display: 'inline-block', textAlign: 'center', fontWeight: 'bold', fontSize: '15px', minWidth: '200px' }}>
                              <div style={{ height: '45px' }}></div>
                              <span>({shared.inSigName.toUpperCase()})</span><br />
                              <span>{shared.inSigDesig}</span><br />
                              Accounts &amp; Treasuries
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* NOTESHEET PREVIEW */}
            {previewTab === 'note' && (
              <div id="note-pages-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="note-sheet document-font" style={{ display: 'block' }}>
                  <div className="note-horizontal-line"></div>
                  {savedNoteHTML ? (
                    <div
                      id="editable-note-wrapper"
                      className={`note-content-wrapper ${notesheetSide === 'front' ? 'note-left-line' : 'note-right-line'}`}
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        fontSize: '17px',
                        lineHeight: 1.5,
                        textAlign: 'justify',
                        outline: 'none'
                      }}
                      dangerouslySetInnerHTML={{ __html: savedNoteHTML }}
                    />
                  ) : (
                    <div
                      id="editable-note-wrapper"
                      className={`note-content-wrapper ${notesheetSide === 'front' ? 'note-left-line' : 'note-right-line'}`}
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        fontSize: '17px',
                        lineHeight: 1.5,
                        textAlign: 'justify',
                        outline: 'none'
                      }}
                    >
                    <div className="note-p" id="note-intro-paragraph">
                      Received an application from the <span className="bold">{shared.inDDOAddress || '...'}</span>, for the issue of an NDC/DC for <span className="bold">{w.fullName}</span>, <span className="out-live-action-text">{w.actionText}</span> <span className="bold">{formatDotDate(shared.inRetireDate)}</span>. The government servant had availed of long-term loans (<span id="out-note-loan-list">{Array.from(w.takenTypes).join(' and ')}</span>). Therefore, a <span id="out-note-cert-type">{w.isGlobalNDC ? 'No Demand Certificate' : 'Demand Certificate'}</span> may be issued.
                    </div>
                    <div className="note-calc-header" style={{ fontWeight: 'bold', marginTop: '15px' }}>Calculation :</div>

                    {calculatedData.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#999', fontWeight: 'normal', marginBottom: '20px' }}>
                        Loan Details thun la, "Generate Calculation" hmet rawh le.
                      </div>
                    ) : (
                      calculatedData.map((loan, lIdx) => {
                        const totalIBB = loan.calcData.reduce((acc, row) => acc + Math.max(0, row.principalAtEnd), 0)
                        const calculatedInterest = (totalIBB * loan.intRate) / 1200
                        const roundedInterest = Math.round(calculatedInterest)
                        const trueOutstandingInterest = roundedInterest - loan.recoveredInt
                        const outstandingPrincipal = loan.calcData.length > 0 ? loan.calcData[loan.calcData.length - 1].principalAtEnd : 0
                        const totalOutstanding = outstandingPrincipal + trueOutstandingInterest

                        const nPLabel = outstandingPrincipal < 0 ? 'Principal Excess Recovery' : 'Principal Outstanding Balance'
                        const nOLabel = trueOutstandingInterest < 0 ? 'Excess Recovery of Interest' : 'Outstanding Balance'
                        const nTLabel = totalOutstanding < 0 ? 'Total Excess (Refundable)' : 'Total Outstanding Balance'

                        return (
                          <div key={lIdx} className="note-loan-block" style={{ marginBottom: '15px' }}>
                            <div className="note-loan-title" style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '10px' }}>
                              Code : {loan.code} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Sanction Amount : ₹{fmtAmt(loans[loan.idx]?.inAmount || 0)}
                            </div>
                            <table className="note-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                <tr><td className="col-label" style={{ width: '280px' }}>{nPLabel}</td><td style={{ width: '20px', textAlign: 'center' }}>:</td><td>₹{fmtAmt(Math.abs(outstandingPrincipal))}</td></tr>
                                <tr><td className="col-label">Interest Accrued</td><td style={{ textAlign: 'center' }}>:</td><td>₹{fmtAmt(roundedInterest)}</td></tr>
                                <tr><td className="col-label">Interest already recovered</td><td style={{ textAlign: 'center' }}>:</td><td>₹{fmtAmt(loan.recoveredInt)}</td></tr>
                                <tr><td className="col-label">{nOLabel}</td><td style={{ textAlign: 'center' }}>:</td><td>₹{fmtAmt(Math.abs(trueOutstandingInterest))}</td></tr>
                                <tr><td className="col-label">{nTLabel}</td><td style={{ textAlign: 'center' }}>:</td><td>₹{fmtAmt(Math.abs(totalOutstanding))}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        )
                      })
                    )}
                      <div id="note-closing-text" style={{ marginTop: '30px', fontSize: '16px' }}>Put up for your approval, please.</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DEMAND / NO DEMAND CERTIFICATE */}
            {previewTab === 'cert' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {!w.isGlobalNDC ? (
                  /* Demand Certificate */
                  <div id="legal-cert-page" className="cert-page document-font cert-layout-default" style={{ display: 'block', padding: '60px 70px', minHeight: '1344px', width: '816px', background: 'white', position: 'relative' }}>
                    <img src="https://industries.mizoram.gov.in/uploads/attachments/2024/10/b17faea85184a6955b7bb5c481426c65/bana-kaih-logo.jpg" alt="Bana Kaih Logo" style={{ position: 'absolute', top: '50px', left: '50px', height: '60px', zIndex: 10 }} />
                    <div className="text-center cert-header" style={{ fontSize: '15px', marginBottom: '15px', fontWeight: 'bold', textAlign: 'center' }}>
                      GOVERNMENT OF MIZORAM<br />
                      OFFICE OF THE CHIEF CONTROLLER OF ACCOUNTS<br />
                      ACCOUNTS &amp; TREASURIES; MIZORAM : AIZAWL
                    </div>
                    <div style={{ textAlign: 'right', marginBottom: '25px', fontSize: '15px', lineHeight: 1.4 }}>
                      <span>{w.fullMemo}</span><br />
                      Dated Aizawl, the <span dangerouslySetInnerHTML={formatFullDate(shared.inIssueDate)}></span>.
                    </div>
                    <div className="text-center cert-title" style={{ fontSize: '17px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '25px', textAlign: 'center' }}>
                      DEMAND CERTIFICATE
                    </div>
                    <div className="cert-body cert-body-text" style={{ textAlign: 'justify', fontSize: '16px', lineHeight: 1.6 }}>
                      <span style={{ marginLeft: '40px' }}>This</span> is to certify that <span className="bold">{w.fullName}</span> under the Office of the <span className="bold">{w.ddoOffice}</span> <span className="out-live-action-text">{w.actionText}</span> <span style={{ marginLeft: '10px', marginRight: '10px' }} className="bold">{formatDotDate(shared.inRetireDate)}</span> has an outstanding liabilities as shown below:
                      
                      <div className="liabilities-list" id="certLiabilitiesContainer" style={{ marginTop: '20px', marginBottom: '5px' }}>
                        {calculatedData.map((loan, lIdx) => {
                          const totalIBB = loan.calcData.reduce((acc, row) => acc + Math.max(0, row.principalAtEnd), 0)
                          const calculatedInterest = (totalIBB * loan.intRate) / 1200
                          const roundedInterest = Math.round(calculatedInterest)
                          const trueOutstandingInterest = roundedInterest - loan.recoveredInt
                          const outstandingPrincipal = loan.calcData.length > 0 ? loan.calcData[loan.calcData.length - 1].principalAtEnd : 0
                          const totalOutstanding = outstandingPrincipal + trueOutstandingInterest

                          if (totalOutstanding <= 0) return null

                          const cPVal = outstandingPrincipal > 0 ? '₹ ' + fmtAmt(outstandingPrincipal) : (outstandingPrincipal < 0 ? 'Excess ₹ ' + fmtAmt(Math.abs(outstandingPrincipal)) : '₹ NIL')
                          const cIVal = trueOutstandingInterest < 0 ? 'Excess ₹ ' + fmtAmt(Math.abs(trueOutstandingInterest)) : '₹ ' + fmtAmt(trueOutstandingInterest) + '/-'
                          const cTVal = totalOutstanding < 0 ? 'Excess ₹ ' + fmtAmt(Math.abs(totalOutstanding)) : '₹ ' + fmtAmt(totalOutstanding) + '/-'
                          const individualWords = amountToWords(totalOutstanding)

                          return (
                            <div key={lIdx} className="liab-item" style={{ marginBottom: '15px' }}>
                              <div className="bold" style={{ display: 'flex', gap: '30px' }}>
                                <span>{lIdx + 1}. &nbsp;&nbsp;&nbsp;&nbsp;{loan.loanNameFull} ({loan.loanType})</span>
                                <span>CODE No. : - {loan.code}</span>
                              </div>
                              <table className="liab-table" style={{ width: '100%', marginLeft: '35px', border: 'none', borderCollapse: 'collapse' }}>
                                <tbody>
                                  <tr>
                                    <td width="35%" style={{ padding: 0, border: 'none' }}>(a) Principal <span className="bold">{cPVal}</span></td>
                                    <td width="35%" style={{ padding: 0, border: 'none' }}>(b) Interest <span className="bold">{cIVal}</span></td>
                                    <td width="30%" className="bold" style={{ padding: 0, border: 'none' }}>TOTAL : {cTVal}</td>
                                  </tr>
                                </tbody>
                              </table>
                              <div className="liab-words" style={{ fontStyle: 'italic', fontWeight: 'bold', marginLeft: '35px' }}>
                                ({individualWords}).
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div id="certHeadsSection" style={{ display: (w.prinHeadsToShow.size > 0 || w.intHeadsToShow.size > 0) ? 'block' : 'none' }}>
                        <div className="cert-head-title" style={{ fontWeight: 'bold', margin: '15px 0 5px 0' }}>The outstanding amount is to be credited under the <span className="bold">Head/Heads</span> of Account :</div>
                        <table className="cert-head-table" style={{ width: '85%', marginLeft: 'auto', marginRight: 'auto', textAlign: 'left', fontWeight: 'bold' }}>
                          <tbody>
                            <tr>
                              <td style={{ textAlign: 'center', textDecoration: 'underline', width: '50%' }}>PRINCIPAL</td>
                              <td style={{ textAlign: 'center', textDecoration: 'underline', width: '50%' }}>INTEREST</td>
                            </tr>
                            <tr>
                              <td style={{ verticalAlign: 'top', paddingRight: '25px' }}>
                                <table id="certHeadsPrinTable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                  <tbody>
                                    {Array.from(w.prinHeadsToShow).map((cat) => (
                                      <tr key={cat}>
                                        <td style={{ textAlign: 'right', width: '45%', whiteSpace: 'nowrap' }}>{cat}</td>
                                        <td style={{ textAlign: 'center', width: '10%' }}>&ndash;</td>
                                        <td style={{ textAlign: 'left', width: '45%', whiteSpace: 'nowrap' }}>{HEADS_OF_ACCOUNT.PRINCIPAL[cat]}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                              <td style={{ verticalAlign: 'top', paddingLeft: '25px' }}>
                                <table id="certHeadsIntTable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                  <tbody>
                                    {Array.from(w.intHeadsToShow).map((cat) => (
                                      <tr key={cat}>
                                        <td style={{ textAlign: 'right', width: '45%', whiteSpace: 'nowrap' }}>{cat}</td>
                                        <td style={{ textAlign: 'center', width: '10%' }}>&ndash;</td>
                                        <td style={{ textAlign: 'left', width: '45%', whiteSpace: 'nowrap' }}>{HEADS_OF_ACCOUNT.INTEREST[cat]}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="cert-closing-note" style={{ fontWeight: 'bold', fontStyle: 'italic', textIndent: '40px', textAlign: 'justify', marginTop: '15px' }}>
                        Original final recovery challan may be submitted to the undersigned after drawal of Pension &amp; DCRG for closing the account.
                      </div>
                    </div>

                    <div className="text-right cert-section-gap" style={{ textAlign: 'right', marginTop: '20px' }}>
                      <div style={{ display: 'inline-block', textAlign: 'center', minWidth: '250px', fontSize: '16px' }}>
                        <div className="sig-space" style={{ height: '45px' }}></div>
                        {shared.inShowSd ? <span className="cert-sd-mark">Sd/-<br /></span> : null}
                        <span className="bold cert-sig-name-disp">{shared.inShowSd ? shared.inSigName.toUpperCase() : `(${shared.inSigName.toUpperCase()})`}</span><br />
                        <span className="out-live-sig-desig">{shared.inSigDesig}</span><br />
                        Accounts &amp; Treasuries
                      </div>
                    </div>
                    
                    <div className="cert-memo-date" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '15px' }}>
                      <div>Memo <span>{w.fullMemo}</span></div>
                      <div>Aizawl, the <span dangerouslySetInnerHTML={formatFullDate(shared.inIssueDate)}></span>.</div>
                    </div>
                    
                    <div className="cert-copy-to" style={{ marginTop: '15px', fontSize: '15px' }}>
                      <div style={{ fontStyle: 'italic', marginBottom: '5px' }}>Copy to :</div>
                      <ol style={{ margin: 0, paddingLeft: '65px', textAlign: 'justify', lineHeight: 1.4 }}>
                        <li className="mb-1">The <span className="bold">{shared.inThawnnaTur}</span> for making adjustment of the Outstanding amount of <span className="bold">Rs. {fmtAmt(w.grandTotalOutstandingPositive)}/-</span> shown above from the DCRG of the <span className="out-live-status">{w.statusWord}</span> Govt. Servant.</li>
                        <li className="mb-1">The <span className="bold">{w.copy2Address}</span> <span>{w.excessDetails.length > 0 ? (
                          <>for information and for making reimbursement of <span dangerouslySetInnerHTML={{ __html: w.excessDetails.join(' and ') }}></span>.</>
                        ) : 'for information.'}</span></li>
                        <li>Person concerned for information.</li>
                      </ol>
                    </div>
                    
                    <div className="text-right cert-footer-gap" style={{ textAlign: 'right', marginTop: '30px' }}>
                      <div style={{ display: 'inline-block', textAlign: 'center', minWidth: '250px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '15px' }}>
                        <div className="sig-space" style={{ height: '45px' }}></div>
                        <span className="out-live-sig-desig-upper">{shared.inSigDesig.toUpperCase()}</span><br />
                        Accounts &amp; Treasuries
                      </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: '40px', left: '70px', right: '70px', borderTop: '1px dashed #999', paddingTop: '5px', textAlign: 'center', fontSize: '9px', color: '#555', lineHeight: 1.2 }}>
                      <span style={{ fontFamily: 'Arial, sans-serif' }}>☎</span> 0389-2343381/2347781(CCA) Fax-2342588/2343383(Director)/2345591(ELFA)/2345187[JD(A)]<br />
                      2345270 [JD(P)]/2345820 [DD(A)]/2340055[DD(E)]/ 2306221[DD(P)]/2345235[DD(F)]/2345825[AD(P)]/ 2356162 [Supdt.]
                    </div>
                  </div>
                ) : (
                  /* No Demand Certificate (A4) */
                  <div id="ndc-cert-page" className="cert-page cert-layout-default" style={{ display: 'block', width: '816px', background: 'white', position: 'relative', minHeight: '1123px', padding: '60px 70px' }}>
                    <img src="https://industries.mizoram.gov.in/uploads/attachments/2024/10/b17faea85184a6955b7bb5c481426c65/bana-kaih-logo.jpg" alt="Bana Kaih Logo" style={{ position: 'absolute', top: '50px', left: '50px', height: '60px', zIndex: 10 }} />
                    <div className="text-center cert-header" style={{ fontSize: '15px', marginBottom: '10px', fontWeight: 'bold', textAlign: 'center' }}>
                      GOVERNMENT OF MIZORAM<br />
                      OFFICE OF THE CHIEF CONTROLLER OF ACCOUNTS<br />
                      ACCOUNTS &amp; TREASURIES; MIZORAM : AIZAWL
                    </div>
                    <div style={{ textAlign: 'right', marginBottom: '15px', fontSize: '15px', lineHeight: 1.4 }}>
                      <span>{w.fullMemo}</span><br />
                      Dated Aizawl, the <span dangerouslySetInnerHTML={formatFullDate(shared.inIssueDate)}></span>.
                    </div>
                    <div className="text-center cert-title" style={{ fontSize: '17px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '15px', textAlign: 'center' }}>
                      NO DEMAND CERTIFICATE
                    </div>
                    <div className="cert-body" style={{ textAlign: 'justify', fontSize: '15px', lineHeight: 1.5 }}>
                      <p style={{ textIndent: '40px', marginBottom: '8px', marginTop: 0 }}>This is to certify that <span className="bold">{w.fullName}</span> under the Department/Office of the <span className="bold">{w.ddoOffice}</span> <span className="out-live-action-text">{w.actionText}</span> <span className="bold">{formatDotDate(shared.inRetireDate)}</span> was granted <span id="ndcLoanListStr">{w.ndcLoanStrings.join(' and ')}</span></p>

                      <p style={{ textIndent: '40px', marginBottom: '8px', marginTop: 0 }}>The Principal with Interest thereon in respect of the above Advance had been recovered in full. There are no any outstanding balances in respect of <span className="bold">{w.cleanName}</span> and <span id="ndcGenderPronoun">{w.pronoun}</span> had not drawn any other long term loan.</p>

                      {w.totalExcessAmount > 0 && (
                        <p style={{ textIndent: '40px', marginBottom: '8px', marginTop: 0 }}>Further, there is an excess recovery of interest amounting to <span className="bold">Rs. {fmtAmt(w.totalExcessAmount)}/- ({amountToWords(w.totalExcessAmount)})</span>.</p>
                      )}

                      <p style={{ textIndent: '40px', marginBottom: '15px', marginTop: 0 }}>Hence, No Demand Certificate of <span className="bold">HBA, Scooter Advance, Computer Advance, Motor Car Advance and Special Car Loan</span> is hereby issued.</p>

                      <div style={{ marginBottom: '20px', fontWeight: 'bold', lineHeight: 1.3 }}>
                        <span style={{ textDecoration: 'underline' }}>{w.posPronoun} Code No. :</span><br />
                        <div id="ndcCodeList">{w.ndcCodeStrings.map((c, i) => <div key={i}>{c}</div>)}</div>
                      </div>
                    </div>

                    <div className="text-right" style={{ marginTop: '20px', marginBottom: '20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-block', textAlign: 'center', minWidth: '250px', fontSize: '15px' }}>
                        <div style={{ height: '35px' }}></div>
                        {shared.inShowSd ? <span className="cert-sd-mark">Sd/-<br /></span> : null}
                        <span className="bold cert-sig-name-disp">{shared.inShowSd ? shared.inSigName.toUpperCase() : `(${shared.inSigName.toUpperCase()})`}</span><br />
                        <span className="out-live-sig-desig">{shared.inSigDesig}</span><br />
                        Accounts &amp; Treasuries
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
                      <div>Memo <span>{w.fullMemo}</span></div>
                      <div>Dated Aizawl, the <span dangerouslySetInnerHTML={formatFullDate(shared.inIssueDate)}></span>.</div>
                    </div>
                    
                    <div style={{ fontSize: '14px' }}>
                      <div style={{ fontStyle: 'italic', marginBottom: '5px' }}>Copy to :</div>
                      <ol style={{ margin: 0, paddingLeft: '65px', textAlign: 'justify', lineHeight: 1.4 }}>
                        <li className="mb-1">The <span className="bold">Director, Local Fund Audit & Pension, Accounts & Treasuries, Mizoram, Aizawl</span> for information.</li>
                        <li className="mb-1">The <span className="bold">{w.copy2Address}</span> <span id="ndcExcessClaimStr">{w.excessDetails.length > 0 ? (
                          <>for information and for making reimbursement of <span dangerouslySetInnerHTML={{ __html: w.excessDetails.join(' and ') }}></span>.</>
                        ) : 'for information and necessary action.'}</span></li>
                        <li>Person concerned for information.</li>
                      </ol>
                    </div>

                    <div className="text-right" style={{ marginTop: '30px', marginBottom: '10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-block', textAlign: 'center', minWidth: '250px', fontWeight: 'bold', fontSize: '15px' }}>
                        <div style={{ height: '35px' }}></div>
                        <span className="out-live-sig-desig-upper">{shared.inSigDesig.toUpperCase()}</span><br />
                        ACCOUNTS &amp; TREASURIES
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeMainTab === 'list' && (
        <div className="record-section" style={{
          background: 'white', padding: '20px', maxWidth: '1400px', margin: '0 auto 20px auto',
          borderRadius: '8px', border: '1px solid #ccc', display: 'block'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ marginTop: 0, marginBottom: 0, color: '#333' }}>Saved Loan Calculations</h2>
            <button
              className="btn btn-export"
              style={{ width: 'auto', marginBottom: 0, fontSize: '14px' }}
              onClick={() => {
                if (records.length === 0) { alert('No records to export'); return; }
                let csv = 'Sl.,Name,Department,Advances,Date Saved,Issue Date\n'
                records.forEach((r, idx) => {
                  csv += `${idx + 1},"${r.name}","${r.dept}","${r.type}","${r.dateSaved}","${r.issueDate || ''}"\n`
                })
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                const url = URL.createObjectURL(blob)
                link.setAttribute('href', url)
                link.setAttribute('download', 'Saved_Loan_Records.csv')
                link.style.visibility = 'hidden'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            >
              📥 EXPORT RECORDS (EXCEL)
            </button>
          </div>

          <div style={{ background: '#e3f2fd', padding: '15px', border: '1px solid #bbdefb', borderRadius: '6px', marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1.5, minWidth: '200px' }}>
              <input type="text" placeholder="🔍 Search by Name..." value={searchName} onChange={e => setSearchName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '14px' }} />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <select value={searchDept} onChange={e => setSearchDept(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '14px' }}>
                <option value="">All Departments</option>
                {Object.keys(DEPT_CODES).map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            
            {auth?.user?.role === 'admin' && creatorsForFilter.length > 0 && (
              <div style={{ flex: 1, minWidth: '120px' }}>
                <select value={filterCreator} onChange={e => setFilterCreator(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '14px' }}>
                  <option value="All">👤 All Staff</option>
                  {creatorsForFilter.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#1565c0', fontSize: '15px' }}>
            Total Cases: <span style={{ background: '#1976d2', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>{filteredRecords.length}</span>
          </div>

          {filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#777', fontStyle: 'italic' }}>
              Saved record a la awm lo.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="record-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '5px', fontSize: '15px' }}>
                <thead>
                  <tr>
                    <th width="5%">Sl.</th>
                    <th width="8%">Dept</th>
                    <th width="18%">Name</th>
                    <th width="22%">Office</th>
                    <th width="12%">Loans</th>
                    <th width="10%">Put up</th>
                    <th width="12%">Issue</th>
                    {auth?.user?.role === 'admin' && (
                      <th width="10%">Siamtu</th>
                    )}
                    <th width="13%">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, idx) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '10px' }}>{idx + 1}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#d32f2f' }}>{r.dept}</td>
                      <td style={{ padding: '10px' }}>{r.name}</td>
                      <td style={{ padding: '10px' }}>
                        <div>{r.sharedInputs.inOffice}</div>
                        <div style={{ fontSize: '12px', color: '#1976d2', fontStyle: 'italic', marginTop: '4px' }}>
                          No. G.26041/{DEPT_CODES[r.dept.toUpperCase()] || 'XX'}/{r.sharedInputs.inMemoYear}-CCA(L&amp;M)/{r.dept.toUpperCase()}{r.sharedInputs.inMemoVol ? `-${r.sharedInputs.inMemoVol}` : ''}/{r.sharedInputs.inMemoPage}
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>{r.type}</td>
                      <td style={{ padding: '10px' }}>{r.sharedInputs.inIssueDate ? new Date(r.sharedInputs.inIssueDate).toLocaleDateString('en-IN') : ''}</td>
                      <td
                        style={{ padding: '10px', cursor: 'text' }}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={async (e) => {
                          const updated = {
                            ...r,
                            issueDate: e.currentTarget.innerText.trim()
                          }
                          try {
                            await fetch('/api/dc', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updated)
                            })
                            fetchRecords()
                          } catch (err) {
                            console.error(err)
                          }
                        }}
                      >
                        {r.issueDate}
                      </td>
                      {auth?.user?.role === 'admin' && (
                        <td style={{ padding: '10px', fontSize: '13px', color: '#555', fontWeight: 'bold' }}>
                          👤 {r.created_by || 'mala'}
                        </td>
                      )}
                      <td style={{ padding: '10px' }}>
                        <div className="action-btns" style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn-edit-rec" onClick={() => handleLoadRecord(r)}>Load</button>
                          <button className="btn-delete-rec" onClick={() => handleDeleteRecord(r.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
