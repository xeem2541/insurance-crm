const fs = require('fs');

const filePath = 'd:\\เว็บ\\Apple Insurance\\frontend\\src\\pages\\Customers.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Header
content = content.replace(
  /<div className="d-flex justify-content-between align-items-center mb-4">[\s\S]*?<h2 className="fw-bold">ข้อมูลลูกค้า \(CRM\)<\/h2>/,
  `<div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h2 className="fw-bold mb-0" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif", color: '#0f172a' }}>
          <i className="bi bi-people-fill me-2" style={{ color: '#3b82f6' }}></i>
          ข้อมูลลูกค้า (CRM)
        </h2>`
);

content = content.replace(
  /<button className="btn btn-outline-success fw-bold me-2" onClick=\{handleExport\}>\s*<i className="bi bi-file-earmark-excel"><\/i> Export Excel\s*<\/button>/,
  `<button className="btn btn-outline-secondary fw-bold px-3 rounded-3 shadow-sm d-flex align-items-center gap-2" onClick={handleExport}>
            <i className="bi bi-file-earmark-excel-fill text-success"></i> Export Excel
          </button>`
);

content = content.replace(
  /<button className="btn btn-primary fw-bold" onClick=\{\(\) => \{[\s\S]*?\}\}>\s*\+ เพิ่มลูกค้าใหม่\s*<\/button>/,
  `<button className="btn fw-bold px-3 rounded-3 shadow-sm d-flex align-items-center gap-2" onClick={() => { 
            setFormData({
              customer_code: '', prefix: '', first_name: '', last_name: '', phone: '', alt_phone: '', 
              line_id: '', facebook: '', dob: '', age: '', address: '', sub_district: '', district: '', province: '', zipcode: '',
              secondary_contact: '', customer_status: 'ลูกค้าใหม่', lead_status: 'สนใจ', source: '', note: ''
            }); 
            setShowModal(true); 
          }} style={{ background: '#3b82f6', color: 'white', border: 'none' }}>
            <i className="bi bi-person-plus-fill"></i> เพิ่มลูกค้าใหม่
          </button>`
);

// Search
content = content.replace(
  /<div className="card shadow-sm border-0 mb-4">/,
  `<div className="card shadow-sm border-0 mb-4 rounded-4" style={{ borderLeft: '4px solid #8b5cf6', background: 'var(--bs-body-bg)' }}>`
);

content = content.replace(
  /<div className="card-body d-flex gap-2 flex-wrap">/,
  `<div className="card-body p-3 p-md-4 d-flex gap-3 flex-wrap">`
);

content = content.replace(
  /<div className="position-relative flex-grow-1" style={{ minWidth: '200px' }}>\s*<input \s*type="text" \s*className="form-control form-control-lg pe-5" \s*placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตรประชาชน, ทะเบียนรถ..."/,
  `<div className="position-relative flex-grow-1" style={{ minWidth: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <i className="bi bi-search"></i>
            </span>
            <input 
              type="text" 
              className="form-control form-control-lg ps-5 pe-5 rounded-pill border-secondary-subtle shadow-sm" 
              style={{ fontSize: '1rem' }}
              placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตรประชาชน, ทะเบียนรถ..."`
);

content = content.replace(
  /<button \s*type="button"\s*className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted text-decoration-none me-2"\s*onClick=\{\(\) => setSearch\(''\)\}\s*style=\{\{ fontSize: '1.2rem', padding: '0 8px' \}\}\s*title="ล้างคำค้นหา"\s*>\s*✕\s*<\/button>/,
  `<button 
                type="button"
                className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted text-decoration-none me-2"
                onClick={() => setSearch('')}
                style={{ fontSize: '1.2rem', padding: '0 8px' }}
                title="ล้างคำค้นหา"
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>`
);

// Filter
content = content.replace(
  /<input \s*type="month" \s*className="form-control form-control-lg" \s*style=\{\{ maxWidth: '200px' \}\}\s*value=\{selectedMonth\}/,
  `<div className="d-flex gap-2 align-items-center">
            <input 
              type="month" 
              className="form-control form-control-lg rounded-pill border-secondary-subtle shadow-sm" 
              style={{ maxWidth: '200px', fontSize: '1rem' }}
              value={selectedMonth}`
);

content = content.replace(
  /<button className="btn btn-success fw-bold px-4" onClick=\{\(\) => queryClient.invalidateQueries\(\{ queryKey: \['customers'\] \}\)\}>\s*<i className="bi bi-funnel-fill"><\/i> กรองข้อมูล\s*<\/button>\s*\{selectedMonth && \(\s*<button className="btn btn-outline-secondary fw-bold" onClick=\{\(\) => setSelectedMonth\(''\)\}>\s*ล้างค่า\s*<\/button>\s*\)\}\s*<\/div>/,
  `<button className="btn rounded-pill px-4 shadow-sm fw-bold d-flex align-items-center gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ['customers'] })} style={{ background: '#10b981', color: 'white', border: 'none' }}>
              <i className="bi bi-funnel-fill"></i> กรองข้อมูล
            </button>
            {selectedMonth && (
              <button className="btn btn-light rounded-pill border shadow-sm fw-bold text-secondary" onClick={() => setSelectedMonth('')}>
                ล้างค่า
              </button>
            )}
          </div>
        </div>`
);

// Table Header
content = content.replace(
  /<div className="table-container-enterprise">\s*<div className="table-responsive">\s*<table className="table table-enterprise align-middle\">\s*<thead>\s*<tr>\s*<th>รหัสลูกค้า<\/th>\s*<th>ชื่อ - นามสกุล<\/th>\s*<th>ข้อมูลติดต่อ<\/th>\s*<th>ทะเบียนรถ<\/th>\s*<th>ประเภทประกันภัย<\/th>\s*<th>สถานะลูกค้า<\/th>\s*<th>สถานะการขาย<\/th>\s*<th>ที่มา \(Source\)<\/th>\s*<th className="text-end">จัดการ<\/th>\s*<\/tr>\s*<\/thead>/,
  `<div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-hover table-striped align-middle mb-0">
            <thead className="table-light" style={{ borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th className="ps-4 py-3 text-secondary fw-semibold">รหัสลูกค้า</th>
                <th className="py-3 text-secondary fw-semibold">ชื่อ - นามสกุล</th>
                <th className="py-3 text-secondary fw-semibold">ข้อมูลติดต่อ</th>
                <th className="py-3 text-secondary fw-semibold">ทะเบียนรถ</th>
                <th className="py-3 text-secondary fw-semibold text-center">ประเภทประกันภัย</th>
                <th className="py-3 text-secondary fw-semibold text-center">สถานะลูกค้า</th>
                <th className="py-3 text-secondary fw-semibold text-center">สถานะการขาย</th>
                <th className="py-3 text-secondary fw-semibold">ที่มา (Source)</th>
                <th className="pe-4 py-3 text-secondary fw-semibold text-end">จัดการ</th>
              </tr>
            </thead>`
);

// Table Row
content = content.replace(
  /<td><span className="badge bg-secondary">\{c\.customer_code\}<\/span><\/td>\s*<td><strong>\{c\.prefix\}\{c\.first_name\} \{c\.last_name\}<\/strong><\/td>\s*<td>\s*<div className="small"><i className="bi bi-telephone-fill text-muted"><\/i> \{c\.phone\}<\/div>\s*\{c\.line_id && <div className="small text-success"><i className="bi bi-line"><\/i> \{c\.line_id\}<\/div>\}\s*<\/td>\s*<td><span className="fw-bold">\{c\.plate_no \|\| '-'\}<\/span><\/td>\s*<td>\{c\.motor_type \|\| c\.non_motor_type \? <span className=\{`badge \$\{c\.motor_type \? 'bg-primary' : 'bg-info'\}`\}>\{c\.motor_type \|\| c\.non_motor_type\}<\/span> : '-'\}<\/td>\s*<td>\{getStatusBadge\(c\.customer_status\)\}<\/td>\s*<td>\{getStatusBadge\(c\.lead_status\)\}<\/td>\s*<td>\{c\.source \|\| '-'\}<\/td>\s*<td className="text-end">\s*<button className="btn btn-sm btn-outline-primary me-2" onClick=\{\(\) => openEdit\(c\)\} title="แก้ไข">\s*<i className="bi bi-pencil"><\/i>\s*<\/button>\s*<button className="btn btn-sm btn-outline-danger" onClick=\{\(\) => handleDelete\(c\.id\)\} title="ลบ">\s*<i className="bi bi-trash"><\/i>\s*<\/button>\s*<\/td>/g,
  `<td className="ps-4"><span className="badge bg-light text-secondary border px-2 py-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.customer_code}</span></td>
                    <td><strong className="text-dark">{c.prefix}{c.first_name} {c.last_name}</strong></td>
                    <td>
                      <div className="small fw-medium text-dark"><i className="bi bi-telephone-fill text-muted me-1"></i> {c.phone}</div>
                      {c.line_id && <div className="small text-success mt-1"><i className="bi bi-line me-1"></i> {c.line_id}</div>}
                    </td>
                    <td><span className="fw-bold text-dark">{c.plate_no || '-'}</span></td>
                    <td className="text-center">{c.motor_type || c.non_motor_type ? <span className={\`badge \${c.motor_type ? 'bg-primary' : 'bg-info'} bg-opacity-10 \${c.motor_type ? 'text-primary' : 'text-info'} border \${c.motor_type ? 'border-primary' : 'border-info'}\`}>{c.motor_type || c.non_motor_type}</span> : '-'}</td>
                    <td className="text-center">{getStatusBadge(c.customer_status)}</td>
                    <td className="text-center">{getStatusBadge(c.lead_status)}</td>
                    <td className="text-muted">{c.source || '-'}</td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-1">
                        <button className="btn btn-sm btn-light text-primary border shadow-sm" onClick={() => openEdit(c)} title="แก้ไข">
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button className="btn btn-sm btn-light text-danger border shadow-sm" onClick={() => handleDelete(c.id)} title="ลบ">
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    </td>`
);

// Pagination
content = content.replace(
  /<div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">\s*<div className="text-muted small">\s*แสดงหน้า \{page\} จากทั้งหมด \{totalPages\} หน้า\s*<\/div>\s*<div className="btn-group">/,
  `<div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="text-muted small fw-semibold">
              แสดงหน้า <span className="text-dark fw-bold">{page}</span> จากทั้งหมด <span className="text-dark fw-bold">{totalPages}</span> หน้า
            </div>
            <div className="btn-group shadow-sm">`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Customers.jsx updated successfully.');
