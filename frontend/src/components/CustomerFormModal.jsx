import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';
import ThaiAddressSelect from './ThaiAddressSelect';
import { formatPhone, formatIdCard } from '../utils/formatters';

const CustomerFormModal = ({ 
  show, 
  onHide, 
  formData, 
  setFormData, 
  handleSubmit, 
  prefixes, 
  leadSources 
}) => {
  const statusOptions = [
    { value: 'ลูกค้าใหม่', label: 'ลูกค้าใหม่' },
    { value: 'ลูกค้าปัจจุบัน', label: 'ลูกค้าปัจจุบัน' },
    { value: 'ลูกค้าต่ออายุ', label: 'ลูกค้าต่ออายุ' },
    { value: 'ลูกค้าหาย', label: 'ลูกค้าหาย' },
    { value: 'ลูกค้า VIP', label: 'ลูกค้า VIP' }
  ];

  const leadOptions = [
    { value: 'สนใจ', label: 'สนใจ' },
    { value: 'ส่งราคาแล้ว', label: 'ส่งราคาแล้ว' },
    { value: 'รอตัดสินใจ', label: 'รอตัดสินใจ' },
    { value: 'ติดตามครั้งที่ 1', label: 'ติดตามครั้งที่ 1' },
    { value: 'ติดตามครั้งที่ 2', label: 'ติดตามครั้งที่ 2' },
    { value: 'ปิดการขาย', label: 'ปิดการขาย' },
    { value: 'ไม่สนใจ', label: 'ไม่สนใจ' }
  ];

  const handleDobChange = (e) => {
    const dob = e.target.value;
    let age = '';
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    setFormData({ ...formData, dob, age });
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>{formData.id ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <div className="row g-3">
            <h5 className="text-primary border-bottom pb-2">ข้อมูลส่วนตัว</h5>
            <div className="col-md-3">
              <Form.Label>รหัสลูกค้า</Form.Label>
              <Form.Control type="text" value={formData.customer_code} onChange={e => setFormData({...formData, customer_code: e.target.value})} required disabled={!!formData.id} placeholder="CUS-YYYY-XXXX" />
            </div>

            <div className="col-md-2">
              <Form.Label>คำนำหน้า</Form.Label>
              <Form.Select value={formData.prefix || ''} onChange={e => setFormData({...formData, prefix: e.target.value})}>
                <option value="">เลือก...</option>
                {prefixes.map(p => <option key={p} value={p}>{p}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>ชื่อ <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
            </div>
            <div className="col-md-4">
              <Form.Label>นามสกุล <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
            </div>
            <div className="col-md-4">
              <Form.Label>วันเกิด</Form.Label>
              <Form.Control type="date" value={formData.dob || ''} onChange={handleDobChange} />
            </div>
            <div className="col-md-2">
              <Form.Label>อายุ (ปี)</Form.Label>
              <Form.Control type="number" value={formData.age || ''} readOnly className="bg-light" />
            </div>

            <h5 className="text-primary border-bottom pb-2 mt-4">ข้อมูลติดต่อ</h5>
            <div className="col-md-3">
              <Form.Label>เลขบัตรประชาชน</Form.Label>
              <Form.Control type="text" value={formatIdCard(formData.id_card_no || '')} onChange={e => setFormData({...formData, id_card_no: e.target.value.replace(/\D/g, '')})} maxLength={17} placeholder="x-xxxx-xxxxx-xx-x" />
            </div>
            <div className="col-md-3">
              <Form.Label>เบอร์โทรศัพท์ <span className="text-danger">*</span></Form.Label>
              <Form.Control required type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} maxLength={12} />
            </div>
            <div className="col-md-3">
              <Form.Label>เบอร์สำรอง</Form.Label>
              <Form.Control type="text" value={formData.alt_phone || ''} onChange={e => setFormData({...formData, alt_phone: formatPhone(e.target.value)})} maxLength={12} />
            </div>

            <div className="col-md-3">
              <Form.Label>LINE ID</Form.Label>
              <Form.Control type="text" value={formData.line_id || ''} onChange={e => setFormData({...formData, line_id: e.target.value})} />
            </div>
            <div className="col-md-4 mt-3">
              <Form.Label>Facebook</Form.Label>
              <Form.Control type="text" value={formData.facebook || ''} onChange={e => setFormData({...formData, facebook: e.target.value})} />
            </div>
            <div className="col-md-4">
              <Form.Label>ผู้ติดต่อสำรอง</Form.Label>
              <Form.Control type="text" value={formData.secondary_contact || ''} onChange={e => setFormData({...formData, secondary_contact: e.target.value})} />
            </div>

            <h5 className="text-primary border-bottom pb-2 mt-4">ที่อยู่จัดส่งเอกสาร</h5>
            <div className="col-md-12">
              <Form.Label>รายละเอียดที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน)</Form.Label>
              <Form.Control as="textarea" rows={2} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <ThaiAddressSelect 
              province={formData.province}
              district={formData.district}
              sub_district={formData.sub_district}
              zipcode={formData.zipcode}
              onChange={(addr) => setFormData({ ...formData, ...addr })}
            />

            <h5 className="text-primary border-bottom pb-2 mt-4">การจัดการงานขาย (CRM)</h5>
            <div className="col-md-4">
              <Form.Label>สถานะลูกค้า</Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"}
                options={statusOptions}
                value={statusOptions.find(s => s.value === formData.customer_status)}
                onChange={option => setFormData({...formData, customer_status: option?.value || 'ลูกค้าใหม่'})}
              />
            </div>
            <div className="col-md-4">
              <Form.Label>สถานะการขาย (Lead Tracking)</Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"}
                options={leadOptions}
                value={leadOptions.find(l => l.value === formData.lead_status)}
                onChange={option => setFormData({...formData, lead_status: option?.value || 'สนใจ'})}
              />
            </div>
            <div className="col-md-4">
              <Form.Label>แหล่งที่มา (Source)</Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"}
                options={leadSources}
                value={leadSources.find(l => l.value === formData.source)}
                onChange={option => setFormData({...formData, source: option?.value || ''})}
                isClearable
              />
            </div>
            <div className="col-12">
              <Form.Label>หมายเหตุเพิ่มเติม</Form.Label>
              <Form.Control as="textarea" rows={3} value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} />
            </div>
          </div>
          <div className="text-end mt-4 pt-3 border-top">
            <Button variant="secondary" className="me-2" onClick={onHide}>ยกเลิก</Button>
            <Button variant="primary" type="submit">บันทึกข้อมูล</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CustomerFormModal;
