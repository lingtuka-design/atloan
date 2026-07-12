import React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div className="home-wrap fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '64px 28px 40px 28px' }}>
      <div className="home">
        <div className="home-eyebrow" style={{
          fontSize: '12px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          fontWeight: 600,
          marginBottom: '10px'
        }}>L&amp;M Section — Internal Tools</div>
        <h1 style={{
          fontSize: '40px',
          fontWeight: 600,
          margin: '0 0 10px 0',
          color: 'var(--ink)'
        }}>Certificate Workspace</h1>
        <p className="sub" style={{
          color: 'var(--ink-soft)',
          fontSize: '16px',
          maxWidth: '800px',
          margin: '0 0 44px 0',
          lineHeight: '1.6'
        }}>Loan &amp; Monitoring Section, Office of the Chief Controller of Accounts, Accounts &amp; Treasuries, Mizoram, Aizawl</p>

        <div className="cards" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          <Link to="/ndc" className="card card-ndc" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-band" style={{ height: '5px', backgroundColor: 'var(--ndc-color)' }}></div>
            <div className="card-body" style={{ padding: '26px 26px 22px 26px' }}>
              <div className="card-mark" style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1.5px solid var(--ndc-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 700,
                fontSize: '15px',
                color: 'var(--ndc-color)',
                backgroundColor: 'var(--ndc-tint)',
                marginBottom: '16px'
              }}>NDC</div>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '23px', fontWeight: 600, color: 'var(--ink)' }}>No Demand Certificate</h2>
              <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--ink-soft)', lineHeight: '1.6' }}>Prepare No Demand Certificates and notesheets, keep the issue log, and export records to Excel.</p>
              <div className="go" style={{
                marginTop: '20px',
                fontSize: '12.5px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--ndc-color)'
              }}>Open workspace →</div>
            </div>
          </Link>

          <Link to="/dc" className="card card-dc" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-band" style={{ height: '5px', backgroundColor: 'var(--dc-color)' }}></div>
            <div className="card-body" style={{ padding: '26px 26px 22px 26px' }}>
              <div className="card-mark" style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1.5px solid var(--dc-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 700,
                fontSize: '15px',
                color: 'var(--dc-color)',
                backgroundColor: 'var(--dc-tint)',
                marginBottom: '16px'
              }}>DC</div>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '23px', fontWeight: 600, color: 'var(--ink)' }}>Demand Certificate</h2>
              <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--ink-soft)', lineHeight: '1.6' }}>Prepare Demand Certificates, work out repayment figures, and manage related records.</p>
              <div className="go" style={{
                marginTop: '20px',
                fontSize: '12.5px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--dc-color)'
              }}>Open workspace →</div>
            </div>
          </Link>

          <Link to="/dak" className="card card-dak" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-band" style={{ height: '5px', backgroundColor: '#334e68' }}></div>
            <div className="card-body" style={{ padding: '26px 26px 22px 26px' }}>
              <div className="card-mark" style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1.5px solid #334e68',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 700,
                fontSize: '13px',
                color: '#334e68',
                backgroundColor: '#f0f4f8',
                marginBottom: '16px'
              }}>DAK</div>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '23px', fontWeight: 600, color: 'var(--ink)' }}>Dak Management</h2>
              <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--ink-soft)', lineHeight: '1.6' }}>Assign cases to staff and track work progress.</p>
              <div className="go" style={{
                marginTop: '20px',
                fontSize: '12.5px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#334e68'
              }}>Open workspace →</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="credit" style={{
        maxWidth: '1000px',
        margin: '56px auto 0 auto',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <div className="credit-inner" style={{ textAlign: 'center' }}>
          <div className="credit-line" style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '17px',
            color: 'var(--ink)',
            borderTop: '1px solid var(--ink)',
            paddingTop: '6px',
            minWidth: '220px'
          }}>Created by : Lalmalsawmtluanga</div>
          <div className="credit-label" style={{
            fontSize: '10.5px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            marginTop: '4px'
          }}>L&amp;M Section</div>
        </div>
      </div>

      <style>{`
        .card {
          background: var(--paper-panel);
          border: 1px solid var(--rule);
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          transition: var(--transition);
        }
        .card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-3px);
        }
        .card-ndc:hover {
          border-color: var(--ndc-color);
        }
        .card-dc:hover {
          border-color: var(--dc-color);
        }
        .card-dak:hover {
          border-color: #334e68;
        }
      `}</style>
    </div>
  )
}
