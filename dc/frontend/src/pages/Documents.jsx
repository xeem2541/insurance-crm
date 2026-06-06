import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';
import CloudinaryUpload from '../components/CloudinaryUpload';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '', policy_id: '', vehicle_id: '', document_type_id: '', name: '', note: ''
  });
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/documents?search=${search}`);
      setDocuments(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [typeRes, custRes, polRes, vehRes] = await Promise.all([
        api.get('/documents/types'),
        api.get('/customers'),
        api.get('/policies'),
        api.get('/vehicles')
      ]);
      setDocumentTypes(typeRes.data);
      setCustomers(custRes.data);
      setPolicies(polRes.data);
      setVehicles(vehRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const handleUploadSuccess = (info) => {
    setFileUrl(info.secure_url);
    setFileType(info.format === 'pdf' ? 'application/pdf' : `image/${info.format}`);
    setFileSize(info.bytes);
    if (!formData.name) {
      setFormData({ ...formData, name: info.original_filename });
    }
  };

  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!fileUrl) return alert('กรุณาอัปโหลดไฟล์ผ่านระบบ Cloudinary ก่อนบันทึก');

    const data = {
      ...formData,
      file_path: fileUrl,
      file_type: fileType,
      file_size: fileSize
    };

    try {
      await api.post('/documents/save-url', data);
      setShowUploadModal(false);
      setFileUrl('');
      setFormData({ customer_id: '', policy_id: '', vehicle_id: '', document_type_id: '', name: '', note: '' });
      fetchDocuments();
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกเอกสาร');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้?')) {
      try {
        await api.delete(`/documents/${id}`);
        fetchDocuments();
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการลบเอกสาร');
      }
    }
  };

  const openPreview = (doc) => {
    // If it's a Cloudinary URL (starts with http), use it directly. Otherwise use local URL.
    const url = doc.file_path.startsWith('http') 
      ? doc.file_path 
      : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}${doc.file_path}`;
    setPreviewUrl(url);
    setPreviewType(doc.file_type);
    setShowPreviewModal(true);
  };

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.customer_code} - ${c.first_name} ${c.last_name}` }));
  const policyOptions = policies.filter(p => p.customer_id === formData.customer_id).map(p => ({ value: p.id, label: `${p.policy_no} (${p.type})` }));
  const vehicleOptions = vehicles.filter(v => v.customer_id === formData.customer_id).map(v => ({ value: v.id, label: `${v.plate_no} ${v.plate_province} - ${v.brand}` }));
  const typeOptions = documentTypes.map(t => ({ value: t.id, label: t.name }));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">ระบบเอกสาร (Documents)</h2>
        <button className="btn btn-primary fw-bold" onClick={() => setShowUploadModal(true)}>
          <i className="bi bi-cloud-arrow-up-fill me-2"></i> อัปโหลดเอกสาร
        </button>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <input 
            type="text" 
            className="form-control form-control-lg" 
            placeholder="ค้นหาชื่อเอกสาร, ประเภทเอกสาร, รหัสลูกค้า..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>ชื่อเอกสาร</th>
                <th>ประเภท</th>
                <th>วันที่อัปโหลด</th>
                <th>ขนาดไฟล์</th>
                <th>ผู้บันทึก</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {documents.length > 0 ? documents.map(d => (
                <tr key={d.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div>
                        <h6 className="mb-0 fw-bold text-primary">{d.name}</h6>
                        <small className="text-muted">v.{d.version}</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge bg-light text-dark border">{d.document_type_name}</span></td>
                  <td>{new Date(d.created_at).toLocaleString('th-TH')}</td>
                  <td>{(d.file_size / 1024 / 1024).toFixed(2)} MB</td>
                  <td>{d.uploader_name || 'System'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-info me-2" onClick={() => openPreview(d)}>
                      <i className="bi bi-eye"></i> ตัวอย่าง
                    </button>
                    <a 
                      href={d.file_path.startsWith('http') ? d.file_path : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}${d.file_path}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-sm btn-outline-secondary me-2"
                      download
                    >
                      <i className="bi bi-download"></i> โหลด
                    </a>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d.id)}>
                      <i className="bi bi-trash"></i> ลบ
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-4">ไม่พบข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>อัปโหลดเอกสารใหม่</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpload}>
            <div className="row g-3">
              <div className="col-md-12">
                <Form.Label>เลือกลูกค้า <span className="text-danger">*</span></Form.Label>
                <Select
                  options={customerOptions}
                  value={customerOptions.find(c => c.value === formData.customer_id)}
                  onChange={option => setFormData({...formData, customer_id: option?.value || '', policy_id: '', vehicle_id: ''})}
                  isClearable
                  required
                />
              </div>
              <div className="col-md-6">
                <Form.Label>ผูกกับกรมธรรม์</Form.Label>
                <Select
                  options={policyOptions}
                  value={policyOptions.find(p => p.value === formData.policy_id)}
                  onChange={option => setFormData({...formData, policy_id: option?.value || ''})}
                  isClearable
                  isDisabled={!formData.customer_id}
                />
              </div>
              <div className="col-md-6">
                <Form.Label>ผูกกับรถยนต์ (รูปรถ)</Form.Label>
                <Select
                  options={vehicleOptions}
                  value={vehicleOptions.find(v => v.value === formData.vehicle_id)}
                  onChange={option => setFormData({...formData, vehicle_id: option?.value || ''})}
                  isClearable
                  isDisabled={!formData.customer_id}
                />
              </div>
              <div className="col-md-12">
                <Form.Label>ประเภทเอกสาร <span className="text-danger">*</span></Form.Label>
                <Select
                  options={typeOptions}
                  value={typeOptions.find(t => t.value === formData.document_type_id)}
                  onChange={option => setFormData({...formData, document_type_id: option?.value || ''})}
                  isClearable
                  required
                />
              </div>
              <div className="col-md-12">
                <Form.Label>ชื่อเอกสารอ้างอิง <span className="text-danger">*</span></Form.Label>
                <Form.Control type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="เช่น ใบเสร็จรับเงิน, รูปรถด้านซ้าย" />
              </div>
              <div className="col-md-12">
                <Form.Label>แนบไฟล์เอกสาร <span className="text-danger">*</span></Form.Label>
                <div className="d-flex align-items-center">
                  <CloudinaryUpload 
                    onUploadSuccess={handleUploadSuccess} 
                    cloudName="djnuhaq6b" 
                    uploadPreset="unsigned_preset" 
                  />
                  {fileUrl && <span className="ms-3 text-success fw-bold"><i className="bi bi-check-circle-fill"></i> อัปโหลดเรียบร้อยแล้ว</span>}
                </div>
              </div>
              <div className="col-12">
                <Form.Label>หมายเหตุ</Form.Label>
                <Form.Control as="textarea" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>
            </div>
            <div className="text-end mt-4 pt-3 border-top">
              <Button variant="secondary" className="me-2" onClick={() => setShowUploadModal(false)}>ยกเลิก</Button>
              <Button variant="primary" type="button" onClick={handleSaveDocument} disabled={!fileUrl}><i className="bi bi-save"></i> บันทึกข้อมูล</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>ตัวอย่างเอกสาร</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center bg-light p-0 d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          {previewType.includes('pdf') ? (
            <iframe src={previewUrl} title="PDF Viewer" width="100%" height="100%" style={{ border: 'none' }} />
          ) : (
            <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Documents;
