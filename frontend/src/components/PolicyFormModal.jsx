import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';

const PolicyFormModal = ({
  show,
  onHide,
  formData,
  setFormData,
  handleSubmit,
  customerOptions,
  vehicleOptions,
  vehicles,
  provincesList,
  companies,
  policyTypes,
  jobStatuses,
  paymentMethods,
  handleCalculate
}) => {

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>{formData.id ? 'แก้ไขกรมธรรม์' : 'เพิ่มกรมธรรม์ใหม่'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-5">
              <Form.Label>ลูกค้า <span className="text-danger">*</span></Form.Label>
              <Select
                options={customerOptions}
                value={customerOptions.find(c => c.value === formData.customer_id)}
                onChange={option => setFormData({...formData, customer_id: option?.value || '', vehicle_id: '', plate_no: ''})}
                isDisabled={formData.id !== null}
                isClearable
                placeholder="เลือก..."
                noOptionsMessage={() => "ไม่พบข้อมูล"}
                required
              />
            </div>
            <div className="col-md-4">
              <Form.Label>รถยนต์ (อ้างอิงจากลูกค้า)</Form.Label>
              <Select
                options={vehicleOptions}
                value={vehicleOptions.find(v => v.value === formData.vehicle_id)}
                onChange={option => {
                  const selectedVeh = vehicles.find(v => v.id === option?.value);
                  setFormData({
                    ...formData, 
                    vehicle_id: option?.value || '', 
                    plate_no: selectedVeh ? (selectedVeh.plate_no || '') : '',
                    plate_province: selectedVeh ? (selectedVeh.plate_province || '') : '',
                    vin: selectedVeh ? (selectedVeh.vin || '') : '',
                    engine_no: selectedVeh ? (selectedVeh.engine_no || '') : '',
                    tax_expiry: selectedVeh && selectedVeh.tax_expiry ? selectedVeh.tax_expiry.split('T')[0] : ''
                  });
                }}
                isClearable
                placeholder="เลือก..."
                noOptionsMessage={() => "ไม่พบข้อมูล"}
                isDisabled={!formData.customer_id}
              />
            </div>
            <div className="col-md-3">
              <Form.Label>ทะเบียนรถ (แก้ไข/เพิ่มใหม่)</Form.Label>
              <Form.Control 
                type="text" 
                value={formData.plate_no} 
                onChange={e => setFormData({...formData, plate_no: e.target.value})}
                placeholder="เช่น กข 1234"
              />
            </div>
            <div className="col-md-3">
              <Form.Label>จังหวัดทะเบียนรถ</Form.Label>
              <Select noOptionsMessage={() => "ไม่พบข้อมูล"}
                options={provincesList}
                value={provincesList.find(p => p.value === formData.plate_province)}
                onChange={opt => setFormData({...formData, plate_province: opt?.value || ''})}
                isClearable
                placeholder="เลือกจังหวัด..."
              />
            </div>
            <div className="col-md-3">
              <Form.Label>เลขตัวถัง (VIN / Chassis No)</Form.Label>
              <Form.Control 
                type="text" 
                value={formData.vin} 
                onChange={e => setFormData({...formData, vin: e.target.value})}
                placeholder="ระบุเลขตัวถัง..."
              />
            </div>
            <div className="col-md-3">
              <Form.Label>เลขเครื่องยนต์</Form.Label>
              <Form.Control 
                type="text" 
                value={formData.engine_no} 
                onChange={e => setFormData({...formData, engine_no: e.target.value})}
                placeholder="ระบุเลขเครื่องยนต์..."
              />
            </div>
            <div className="col-md-3">
              <Form.Label>วันภาษีรถหมดอายุ</Form.Label>
              <Form.Control 
                type="date" 
                value={formData.tax_expiry} 
                onChange={e => setFormData({...formData, tax_expiry: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <Form.Label>วันเริ่มคุ้มครอง พ.ร.บ.</Form.Label>
              <Form.Control 
                type="date" 
                value={formData.prb_start_date} 
                onChange={e => setFormData({...formData, prb_start_date: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <Form.Label>วันสิ้นสุดคุ้มครอง พ.ร.บ.</Form.Label>
              <Form.Control 
                type="date" 
                value={formData.prb_expiry_date} 
                onChange={e => setFormData({...formData, prb_expiry_date: e.target.value})}
              />
            </div>

            <div className="col-12"><hr/></div>

            <div className="col-md-4">
              <Form.Label>เลขกรมธรรม์ <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" value={formData.policy_no} onChange={e => setFormData({...formData, policy_no: e.target.value})} required />
            </div>
            <div className="col-md-4">
              <Form.Label>บริษัทประกัน <span className="text-danger">*</span></Form.Label>
              <Select
                options={companies}
                value={companies.find(c => c.value === formData.company)}
                onChange={option => setFormData({...formData, company: option?.value || ''})}
                isClearable
                placeholder="เลือก..."
                noOptionsMessage={() => "ไม่พบข้อมูล"}
                required
              />
            </div>
            <div className="col-md-4">
              <Form.Label>ประเภทประกัน <span className="text-danger">*</span></Form.Label>
              <Select
                options={policyTypes}
                value={policyTypes.find(p => p.value === formData.type)}
                onChange={option => {
                  const selectedType = option?.value || '';
                  let newPercent = formData.commission_percent;

                  // กำหนดค่า % ตามประเภทกรมธรรม์
                  if (selectedType.includes('2+')) {
                    newPercent = 25;
                  } else if (selectedType.includes('3+')) {
                    newPercent = 25;
                  } else if (selectedType.includes('3')) {
                    newPercent = 18;
                  } else if (selectedType.includes('1')) {
                    newPercent = 18;
                  }

                  // คำนวณคอมมิชชันเป็นบาทใหม่
                  const net = parseFloat(formData.net_premium) || 0;
                  let newCommBaht = formData.commission_baht;
                  if (newPercent !== formData.commission_percent && net > 0) {
                    newCommBaht = parseFloat((net * (newPercent / 100)).toFixed(2));
                  }

                  setFormData({
                    ...formData, 
                    type: selectedType,
                    commission_percent: newPercent,
                    commission_baht: newCommBaht !== formData.commission_baht ? newCommBaht : formData.commission_baht
                  });
                }}
                isClearable
                placeholder="เลือก..."
                noOptionsMessage={() => "ไม่พบข้อมูล"}
                required
              />
            </div>

            <div className="col-md-3">
              <Form.Label>ประเภทการซ่อม</Form.Label>
              <Form.Select 
                value={formData.repair_type || 'อู่'} 
                onChange={e => setFormData({...formData, repair_type: e.target.value})}
              >
                <option value="อู่">ซ่อมอู่ (Contract Garage)</option>
                <option value="ศูนย์">ซ่อมศูนย์ / ซ่อมห้าง (Dealer Service)</option>
              </Form.Select>
            </div>

            <div className="col-md-3">
              <Form.Label>ทุนประกัน</Form.Label>
              <Form.Control type="number" step="0.01" value={formData.sum_insured} onChange={e => setFormData({...formData, sum_insured: e.target.value})} />
            </div>
            <div className="col-md-3">
              <Form.Label>วันเริ่มคุ้มครอง <span className="text-danger">*</span></Form.Label>
              <Form.Control type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
            </div>
            <div className="col-md-3">
              <Form.Label>วันหมดอายุ <span className="text-danger">*</span></Form.Label>
              <Form.Control type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} required />
            </div>
            <div className="col-md-3">
              <Form.Label>สถานะงาน</Form.Label>
              <Select
                options={jobStatuses}
                value={jobStatuses.find(j => j.value === formData.status)}
                onChange={option => setFormData({...formData, status: option?.value || ''})}
                isClearable
                placeholder="เลือก..."
                noOptionsMessage={() => "ไม่พบข้อมูล"}
              />
            </div>

            <div className="col-12"><hr/></div>

            {/* Premium Calculation Block */}
            <div className="col-md-12 mb-2 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-primary fw-bold">ส่วนคำนวณเบี้ยและคอมมิชชัน</h5>
              <Button variant="outline-success" size="sm" onClick={handleCalculate}><i className="bi bi-calculator"></i> คำนวณอัตโนมัติ</Button>
            </div>

            <div className="col-md-3">
              <Form.Label>เบี้ยสุทธิ</Form.Label>
              <Form.Control type="number" step="0.01" value={formData.net_premium} onChange={e => setFormData({...formData, net_premium: e.target.value})} onBlur={handleCalculate} />
            </div>
            <div className="col-md-3">
              <Form.Label>อากรแสตมป์</Form.Label>
              <Form.Control type="number" step="0.01" value={formData.stamp_duty} onChange={e => setFormData({...formData, stamp_duty: e.target.value})} />
            </div>
            <div className="col-md-3">
              <Form.Label>VAT (7%)</Form.Label>
              <Form.Control type="number" step="0.01" value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} />
            </div>
            <div className="col-md-3">
              <Form.Label className="fw-bold text-success">เบี้ยรวม (Total)</Form.Label>
              <Form.Control type="number" step="0.01" className="bg-light fw-bold text-success" value={formData.total_premium} onChange={e => setFormData({...formData, total_premium: e.target.value})} />
            </div>

            <div className="col-md-3">
              <Form.Label>ค่าคอมฯ (%)</Form.Label>
              <Form.Control type="number" step="0.01" value={formData.commission_percent} onChange={e => setFormData({...formData, commission_percent: e.target.value})} onBlur={handleCalculate} />
            </div>
            <div className="col-md-3">
              <Form.Label className="fw-bold text-danger">คอมมิชชัน (บาท)</Form.Label>
              <Form.Control type="number" step="0.01" className="bg-light fw-bold text-danger" value={formData.commission_baht} onChange={e => setFormData({...formData, commission_baht: e.target.value})} />
            </div>
            <div className="col-md-6">
              <Form.Label>วิธีชำระเงิน</Form.Label>
              <Select
                options={paymentMethods}
                value={paymentMethods.find(m => m.value === formData.payment_method)}
                onChange={option => setFormData({...formData, payment_method: option?.value || ''})}
                isClearable
                placeholder="เลือก..."
                noOptionsMessage={() => "ไม่พบข้อมูล"}
              />
            </div>

          </div>
          <div className="text-end mt-4 pt-3 border-top">
            <Button variant="secondary" className="me-2" onClick={onHide}>ยกเลิก</Button>
            <Button variant="primary" type="submit">บันทึกกรมธรรม์</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default PolicyFormModal;
