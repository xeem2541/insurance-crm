import { Modal, Button, Form } from 'react-bootstrap';

export const MasterDataModal = ({
  show,
  onHide,
  formData,
  setFormData,
  handleSubmit,
  categories
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">{formData.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted">หมวดหมู่</Form.Label>
            <Form.Control type="text" value={categories.find(c => c.id === formData.category)?.label || formData.category} disabled className="bg-light" />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">ค่าที่แสดงผล (Value)</Form.Label>
            <Form.Control 
              type="text" 
              value={formData.value} 
              onChange={(e) => setFormData({...formData, value: e.target.value})} 
              required 
              autoFocus
            />
          </Form.Group>
          <div className="text-end">
            <Button variant="light" className="me-2 fw-bold" onClick={onHide}>ยกเลิก</Button>
            <Button variant="primary" type="submit" className="fw-bold px-4 shadow-sm">บันทึกข้อมูล</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export const UserModal = ({
  show,
  onHide,
  userFormData,
  setUserFormData,
  handleUserSubmit
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">{userFormData.id ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleUserSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">ชื่อบัญชี (Username)</Form.Label>
            <Form.Control 
              type="text" 
              value={userFormData.username} 
              onChange={(e) => setUserFormData({...userFormData, username: e.target.value})} 
              required 
              disabled={!!userFormData.id} // Cannot edit username after creation
            />
            {!userFormData.id && <Form.Text className="text-muted">ใช้สำหรับเข้าสู่ระบบ (ห้ามซ้ำ)</Form.Text>}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">ชื่อ-นามสกุล (Name)</Form.Label>
            <Form.Control 
              type="text" 
              value={userFormData.name} 
              onChange={(e) => setUserFormData({...userFormData, name: e.target.value})} 
              required 
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">รหัสผ่าน (Password)</Form.Label>
            <Form.Control 
              type="password" 
              value={userFormData.password} 
              onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} 
              required={!userFormData.id} 
            />
            {userFormData.id && <Form.Text className="text-muted">เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน</Form.Text>}
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">สิทธิ์การใช้งาน (Role)</Form.Label>
            <Form.Select 
              value={userFormData.role} 
              onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
            >
              <option value="Admin">Admin (ดูแลระบบ)</option>
              <option value="Manager">Manager (ผู้จัดการ)</option>
              <option value="Sales">Sales (เซลส์)</option>
              <option value="Staff">Staff (พนักงานทั่วไป)</option>
              <option value="Viewer">Viewer (ดูได้อย่างเดียว)</option>
            </Form.Select>
          </Form.Group>
          <div className="text-end">
            <Button variant="light" className="me-2 fw-bold" onClick={onHide}>ยกเลิก</Button>
            <Button variant="primary" type="submit" className="fw-bold px-4 shadow-sm">บันทึกข้อมูล</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};
