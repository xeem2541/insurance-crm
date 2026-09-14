import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';
import CloudinaryUpload from './CloudinaryUpload';

const DocumentUploadModal = ({
  show,
  onHide,
  formData,
  setFormData,
  fileUrl,
  setFileUrl,
  localFile,
  setLocalFile,
  handleSaveDocument,
  customerOptions,
  policyOptions,
  vehicleOptions,
  typeOptions
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>อัปโหลดเอกสารใหม่</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSaveDocument}>
          <div className="row g-3">
            <div className="col-md-12">
              <Form.Label>เลือกลูกค้า <span className="text-danger">*</span></Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"}
                options={customerOptions}
                value={customerOptions.find(c => c.value === formData.customer_id)}
                onChange={option => setFormData({...formData, customer_id: option?.value || '', policy_id: '', vehicle_id: ''})}
                isClearable
                required
              />
            </div>
            <div className="col-md-6">
              <Form.Label>ผูกกับกรมธรรม์</Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"}
                options={policyOptions}
                value={policyOptions.find(p => p.value === formData.policy_id)}
                onChange={option => setFormData({...formData, policy_id: option?.value || ''})}
                isClearable
                isDisabled={!formData.customer_id}
              />
            </div>
            <div className="col-md-6">
              <Form.Label>ผูกกับรถยนต์ (รูปรถ)</Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"}
                options={vehicleOptions}
                value={vehicleOptions.find(v => v.value === formData.vehicle_id)}
                onChange={option => setFormData({...formData, vehicle_id: option?.value || ''})}
                isClearable
                isDisabled={!formData.customer_id}
              />
            </div>
            <div className="col-md-12">
              <Form.Label>ประเภทเอกสาร <span className="text-danger">*</span></Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"}
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
              {(() => {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalhost) {
                  return (
                    <Form.Control 
                      type="file" 
                      required
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setLocalFile(file);
                        if (file && !formData.name) {
                          setFormData({ ...formData, name: file.name.split('.')[0] });
                        }
                      }} 
                    />
                  );
                } else {
                  return (
                    <div className="d-flex align-items-center">
                      <CloudinaryUpload 
                        onUploadSuccess={(info) => {
                          setFileUrl(info.secure_url);
                          setFormData(prev => ({
                            ...prev,
                            fileType: info.format === 'pdf' ? 'application/pdf' : `image/${info.format}`,
                            fileSize: info.bytes,
                            name: prev.name || info.original_filename
                          }));
                        }} 
                        cloudName="djnuhaq6b" 
                        uploadPreset="unsigned_preset" 
                      />
                      {fileUrl && <span className="ms-3 text-success fw-bold"><i className="bi bi-check-circle-fill"></i> อัปโหลดเรียบร้อยแล้ว</span>}
                    </div>
                  );
                }
              })()}
            </div>
            <div className="col-12">
              <Form.Label>หมายเหตุ</Form.Label>
              <Form.Control as="textarea" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
            </div>
          </div>
          <div className="text-end mt-4 pt-3 border-top">
            <Button variant="secondary" className="me-2" onClick={onHide}>ยกเลิก</Button>
            <Button variant="primary" type="submit" disabled={(!localFile && !fileUrl) && window.location.hostname !== 'localhost'}><i className="bi bi-save"></i> บันทึกข้อมูล</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default DocumentUploadModal;
