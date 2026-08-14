import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, Table, Form, Button, Row, Col, Badge, Spinner, Pagination } from 'react-bootstrap';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [topUsers, setTopUsers] = useState([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/activity-logs/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users for filter:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
        search: search.trim() || undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        userId: userFilter !== 'all' ? userFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const res = await api.get('/activity-logs', { params });
      setLogs(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
      setStats(res.data.stats || {});
      setTopUsers(res.data.topUsers || []);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, userFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('all');
    setUserFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getActionBadge = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATE')) {
      return (
        <span className="badge rounded-pill px-3 py-1 bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-plus-circle-fill"></i> สร้างใหม่
        </span>
      );
    }
    if (act.includes('UPDATE')) {
      return (
        <span className="badge rounded-pill px-3 py-1 bg-warning-subtle text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-pencil-fill"></i> แก้ไขข้อมูล
        </span>
      );
    }
    if (act.includes('DELETE')) {
      return (
        <span className="badge rounded-pill px-3 py-1 bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-trash3-fill"></i> ลบข้อมูล
        </span>
      );
    }
    if (act.includes('LOGIN')) {
      return (
        <span className="badge rounded-pill px-3 py-1 bg-info-subtle text-info-emphasis border border-info-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ
        </span>
      );
    }
    return (
      <span className="badge rounded-pill px-3 py-1 bg-secondary-subtle text-secondary border border-secondary-subtle">
        {action}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="container-fluid py-3 px-3 px-lg-4">
      {/* Header Banner */}
      <div 
        className="rounded-4 p-4 mb-4 text-white position-relative overflow-hidden shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge px-3 py-1 rounded-pill" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.4)', fontSize: '0.8rem' }}>
                <i className="bi bi-shield-lock-fill me-1"></i> Security & Audit Trail
              </span>
              <span className="badge rounded-pill px-3 py-1" style={{ background: 'rgba(0, 255, 136, 0.15)', color: '#00ff88', border: '1px solid rgba(0, 255, 136, 0.3)', fontSize: '0.75rem' }}>
                ● Real-Time Logging
              </span>
            </div>
            <h2 className="fw-bold mb-1" style={{ color: '#ffffff', letterSpacing: '-0.5px' }}>
              ประวัติการทำงานและกิจกรรมในระบบ (Audit Trail)
            </h2>
            <p className="text-white-50 mb-0 small" style={{ maxWidth: '600px' }}>
              ตรวจสอบย้อนหลังได้ทุกการกระทำ ดูว่าพนักงานคนไหนเป็นผู้สร้าง แก้ไข หรือลบข้อมูลกรมธรรม์และลูกค้า พร้อมบันทึกวันและเวลาอย่างโปร่งใส
            </p>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <Button variant="outline-light" size="sm" onClick={fetchLogs} disabled={loading} className="rounded-3 px-3 py-2">
              <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'spin' : ''}`}></i> รีเฟรชข้อมูล
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100 p-3 card-stat-modern" style={{ borderTop: '4px solid #38bdf8' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted d-block mb-1">กิจกรรมวันนี้</small>
                <h3 className="fw-bold mb-0 text-dark">{stats.today_count || 0}</h3>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#0284c7' }}>
                <i className="bi bi-calendar2-check-fill fs-4"></i>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100 p-3 card-stat-modern" style={{ borderTop: '4px solid #10b981' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted d-block mb-1">รายการสร้างใหม่</small>
                <h3 className="fw-bold mb-0 text-success">{stats.create_count || 0}</h3>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                <i className="bi bi-plus-circle-fill fs-4"></i>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100 p-3 card-stat-modern" style={{ borderTop: '4px solid #f59e0b' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted d-block mb-1">รายการแก้ไข</small>
                <h3 className="fw-bold mb-0 text-warning">{stats.update_count || 0}</h3>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
                <i className="bi bi-pencil-square fs-4"></i>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100 p-3 card-stat-modern" style={{ borderTop: '4px solid #ef4444' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted d-block mb-1">รายการลบข้อมูล</small>
                <h3 className="fw-bold mb-0 text-danger">{stats.delete_count || 0}</h3>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}>
                <i className="bi bi-trash3-fill fs-4"></i>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter & Search Panel */}
      <Card className="border-0 shadow-sm rounded-4 p-3 mb-4">
        <Form onSubmit={handleSearchSubmit}>
          <Row className="g-2 align-items-end">
            <Col xs={12} md={4}>
              <Form.Label className="small text-muted fw-bold mb-1">ค้นหากิจกรรม / รายละเอียด</Form.Label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <Form.Control
                  type="text"
                  placeholder="พิมพ์ชื่อพนักงาน, เลขกรมธรรม์, คำอธิบาย..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-start-0"
                />
              </div>
            </Col>

            <Col xs={6} md={2}>
              <Form.Label className="small text-muted fw-bold mb-1">ประเภทการกระทำ</Form.Label>
              <Form.Select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
                <option value="all">ทั้งหมด (All Actions)</option>
                <option value="CREATE_POLICY">สร้างกรมธรรม์ (Create Policy)</option>
                <option value="UPDATE_POLICY">แก้ไขกรมธรรม์ (Update Policy)</option>
                <option value="DELETE_POLICY">ลบกรมธรรม์ (Delete Policy)</option>
                <option value="CREATE_CUSTOMER">เพิ่มลูกค้าใหม่ (Create Customer)</option>
                <option value="UPDATE_CUSTOMER">แก้ไขลูกค้า (Update Customer)</option>
                <option value="DELETE_CUSTOMER">ลบลูกค้า (Delete Customer)</option>
                <option value="LOGIN">เข้าสู่ระบบ (Login)</option>
              </Form.Select>
            </Col>

            <Col xs={6} md={2}>
              <Form.Label className="small text-muted fw-bold mb-1">พนักงานผู้ทำรายการ</Form.Label>
              <Form.Select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}>
                <option value="all">ทุกคน (All Users)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                ))}
              </Form.Select>
            </Col>

            <Col xs={6} md={2}>
              <Form.Label className="small text-muted fw-bold mb-1">ตั้งแต่วันที่</Form.Label>
              <Form.Control type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
            </Col>

            <Col xs={6} md={2}>
              <div className="d-flex gap-2">
                <div className="flex-grow-1">
                  <Form.Label className="small text-muted fw-bold mb-1">ถึงวันที่</Form.Label>
                  <Form.Control type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
                </div>
                <Button variant="light" onClick={handleResetFilters} title="ล้างตัวกรอง" className="border align-self-end py-2 px-3">
                  <i className="bi bi-x-lg text-danger"></i>
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Logs Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-clock-history text-primary"></i>
            <span>รายการบันทึกประวัติการทำงาน</span>
          </h5>
          <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1 fw-bold">
            พบ {totalRecords} รายการ
          </span>
        </div>

        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4" style={{ width: '60px' }}>#</th>
                <th style={{ width: '180px' }}>วัน-เวลาที่ทำรายการ</th>
                <th style={{ width: '180px' }}>พนักงาน (ผู้ทำรายการ)</th>
                <th style={{ width: '140px' }}>ประเภทการกระทำ</th>
                <th>รายละเอียดกิจกรรม</th>
                <th style={{ width: '130px' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <div className="mt-2 text-muted small">กำลังโหลดประวัติการทำงาน...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2 text-muted opacity-50"></i>
                    ไม่พบรายการประวัติการทำงานที่ค้นหา
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id}>
                    <td className="ps-4 text-muted small">
                      {(page - 1) * 25 + idx + 1}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark small">{formatDate(log.created_at)}</div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                          style={{
                            width: '32px',
                            height: '32px',
                            background: log.user_role === 'Admin' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' :
                                       log.user_role === 'Manager' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                       'linear-gradient(135deg, #3b82f6, #6366f1)',
                            fontSize: '0.8rem'
                          }}
                        >
                          {log.user_name ? log.user_name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">{log.user_name || 'System'}</div>
                          <span className="badge bg-secondary-subtle text-secondary px-2 py-0" style={{ fontSize: '0.68rem' }}>
                            {log.user_role || 'Staff'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {getActionBadge(log.action)}
                    </td>
                    <td>
                      <div className="text-dark small" style={{ lineHeight: '1.4' }}>
                        {log.description || '-'}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-muted border px-2 py-1 font-monospace" style={{ fontSize: '0.75rem' }}>
                        {log.ip_address || '127.0.0.1'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
            <small className="text-muted">
              แสดงหน้า {page} จาก {totalPages} หน้า (ทั้งหมด {totalRecords} รายการ)
            </small>
            <Pagination className="mb-0">
              <Pagination.Prev disabled={page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))} />
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = page - 2 + i;
                if (pageNum < 1) pageNum = i + 1;
                if (pageNum > totalPages) return null;
                return (
                  <Pagination.Item key={pageNum} active={pageNum === page} onClick={() => setPage(pageNum)}>
                    {pageNum}
                  </Pagination.Item>
                );
              })}
              <Pagination.Next disabled={page >= totalPages} onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} />
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityLogs;
