import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';
import { carBrands, carModels } from '../data/carData';

const provincesList = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 
  'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 
  'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 
  'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
].map(p => ({ value: p, label: p }));

const VehicleFormModal = ({
  show,
  onHide,
  formData,
  setFormData,
  handleSubmit,
  customerOptions,
  vehicleTypes
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{formData.id ? 'แก้ไขข้อมูลรถยนต์' : 'เพิ่มรถยนต์ใหม่'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-12">
              <Form.Label>ลูกค้า <span className="text-danger">*</span></Form.Label>
              <Select
                options={customerOptions}
                value={customerOptions.find(c => c.value === formData.customer_id)}
                onChange={option => setFormData({...formData, customer_id: option?.value || ''})}
                isDisabled={formData.id !== null}
                isClearable
                placeholder="เลือก..."
                noOptionsMessage={() => "ไม่พบข้อมูล"}
                required
              />
            </div>
            <div className="col-md-6">
              <Form.Label>ทะเบียนรถ <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" value={formData.plate_no || ''} onChange={e => setFormData({...formData, plate_no: e.target.value})} required />
            </div>
            <div className="col-md-6">
              <Form.Label>จังหวัดทะเบียน</Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"} 
                options={provincesList} 
                value={provincesList.find(p => p.value === formData.plate_province)} 
                onChange={opt => setFormData({...formData, plate_province: opt?.value || ''})} 
                isClearable 
                placeholder="เลือกจังหวัด..."
              />
            </div>
            <div className="col-md-6">
              <Form.Label>ประเภทรถ <span className="text-danger">*</span></Form.Label>
              <Select
                options={vehicleTypes}
                value={vehicleTypes.find(t => t.value === formData.vehicle_type)}
                onChange={option => setFormData({...formData, vehicle_type: option?.value || ''})}
                isClearable
                placeholder="เลือก..."
                noOptionsMessage={() => "ไม่พบข้อมูล"}
                required
              />
            </div>
            <div className="col-md-6">
              <Form.Label>ยี่ห้อ (Brand)</Form.Label>
              <Form.Select value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value, model: ''})}>
                <option value="">เลือกยี่ห้อ...</option>
                {carBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>รุ่น (Model)</Form.Label>
              <Form.Select value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})}>
                <option value="">เลือกรุ่น...</option>
                {(carModels[formData.brand] || []).map(m => <option key={m} value={m}>{m}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>ปีจดทะเบียน (Year)</Form.Label>
              <Form.Select value={formData.year || ''} onChange={e => setFormData({...formData, year: e.target.value})}>
                <option value="">เลือกปี...</option>
                {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>สีรถ</Form.Label>
              <Form.Select value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})}>
                <option value="">เลือกสี...</option>
                {['ขาว', 'ดำ', 'เทา', 'บรอนซ์เงิน', 'บรอนซ์ทอง', 'แดง', 'น้ำเงิน', 'ฟ้า', 'น้ำตาล', 'เขียว', 'เหลือง', 'ส้ม', 'ชมพู', 'อื่นๆ'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>ทุนประกันที่แนะนำ (บาท)</Form.Label>
              <Form.Control type="number" step="0.01" value={formData.sum_insured || ''} onChange={e => setFormData({...formData, sum_insured: e.target.value})} />
            </div>
            <div className="col-md-6">
              <Form.Label>เลขตัวถัง (VIN)</Form.Label>
              <Form.Control type="text" value={formData.vin || ''} onChange={e => setFormData({...formData, vin: e.target.value})} />
            </div>
            <div className="col-md-6">
              <Form.Label>เลขเครื่องยนต์</Form.Label>
              <Form.Control type="text" value={formData.engine_no || ''} onChange={e => setFormData({...formData, engine_no: e.target.value})} />
            </div>
            <div className="col-md-6">
              <Form.Label>วันหมดอายุภาษี (ป้ายวงกลม)</Form.Label>
              <Form.Control type="date" value={formData.tax_expiry || ''} onChange={e => setFormData({...formData, tax_expiry: e.target.value})} />
            </div>
            <div className="col-md-6">
              <Form.Label>วันหมดอายุ พ.ร.บ.</Form.Label>
              <Form.Control type="date" value={formData.act_expiry || ''} onChange={e => setFormData({...formData, act_expiry: e.target.value})} />
            </div>
          </div>
          <div className="text-end mt-4">
            <Button variant="secondary" className="me-2" onClick={onHide}>ยกเลิก</Button>
            <Button variant="primary" type="submit">บันทึกข้อมูล</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default VehicleFormModal;
