import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Form, Button, Card, Row, Col, InputGroup, Accordion, Badge } from 'react-bootstrap';
import Select from 'react-select';
import { useDropzone } from 'react-dropzone';
import ThaiAddressSelect from '../components/ThaiAddressSelect';

const IssuePolicyForm = () => {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Master Data Options
  const [companies, setCompanies] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [jobStatuses, setJobStatuses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [nonMotorTypes, setNonMotorTypes] = useState([]);
  const [docTypes, setDocTypes] = useState([]);

  // Form State
  const [customer, setCustomer] = useState({
    id: null, prefix: 'นาย', first_name: '', last_name: '', id_card_no: '', dob: '', age: '',
    phone: '', email: '', line_id: '', facebook: '', occupation: '',
    address: '', moo: '', soi: '', road: '', sub_district: '', district: '', province: '', zipcode: '', note: ''
  });

  const [vehicle, setVehicle] = useState({
    vehicle_type: '', brand: '', model: '', year: '', color: '', 
    plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: ''
  });

  const [policy, setPolicy] = useState({
    category: 'motor', // 'motor' or 'non-motor'
    company: '', type: '', policy_no: '', sum_insured: '', 
    net_premium: '', stamp_duty: '', vat: '', total_premium: '',
    prb_start_date: '', prb_expiry_date: '', start_date: '', expiry_date: '',
    non_motor_type_id: '', additional_data: {}, insured_name: '', status: 'รอดำเนินการ'
  });

  const [payment, setPayment] = useState({
    payment_method: 'เงินสด', installments: 1, pay_date: '', status: 'รอดำเนินการ'
  });

  const [followUp, setFollowUp] = useState({
    status: 'รอดำเนินการ', next_date: '', note: ''
  });

  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const mdRes = await api.get('/master-data');
      const md = mdRes.data;
      setCompanies(md.filter(m => m.category === 'InsuranceCompany').map(m => ({ value: m.value, label: m.value })));
      setVehicleTypes(md.filter(m => m.category === 'VehicleType').map(m => ({ value: m.value, label: m.value })));
      setJobStatuses(md.filter(m => m.category === 'JobStatus').map(m => ({ value: m.value, label: m.value })));
      setPaymentMethods(md.filter(m => m.category === 'PaymentMethod').map(m => ({ value: m.value, label: m.value })));
      
      const nmRes = await api.get('/non-motor-policies/types');
      setNonMotorTypes(nmRes.data.map(t => ({ value: t.id, label: t.name })));

      // Default Document Types fallback if api fails
      setDocTypes([
        { id: 1, name: 'ตารางกรมธรรม์' }, { id: 2, name: 'ใบเสร็จรับเงิน' },
        { id: 3, name: 'สำเนาบัตรประชาชน' }, { id: 4, name: 'สำเนาทะเบียนรถ' },
        { id: 5, name: 'รูปถ่ายรถยนต์' }, { id: 6, name: 'อื่นๆ' }
      ]);
      
      // Hardcode provinces for simplicity, or we could fetch from an API
      setProvinces([
        'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 
        'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 
        'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 
        'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 
        'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 
        'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 
        'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 
        'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
      ].map(p => ({ value: p, label: p })));
    } catch (error) {
      console.error(error);
    }
  };

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
    setCustomer({ ...customer, dob, age });
  };

  const calculatePremiumsAndComm = () => {
    const net = parseFloat(policy.net_premium) || 0;
    const stamp = Math.ceil(net * 0.004);
    const v = parseFloat(((net + stamp) * 0.07).toFixed(2));
    const total = net + stamp + v;

    let commPercent = 0;
    
    if (policy.category === 'motor') {
      if (policy.type === 'ประกันภัยชั้น 1') commPercent = 18;
      else if (policy.type === 'ประกันภัยชั้น 2+') commPercent = 25;
      else if (policy.type === 'ประกันภัยชั้น 3+') commPercent = 25;
      else if (policy.type === 'ประกันภัยชั้น 3') commPercent = 18;
    } else {
      const typeLabel = nonMotorTypes.find(t => t.value === parseInt(policy.non_motor_type_id))?.label || '';
      if (typeLabel.includes('ขนส่ง')) commPercent = 10;
      else if (typeLabel.includes('อัคคีภัย') || typeLabel.includes('ไฟไหม้')) commPercent = 23;
      else if (typeLabel.includes('PA') || typeLabel.includes('อุบัติเหตุ')) commPercent = 18;
    }

    setPolicy({
      ...policy,
      stamp_duty: stamp,
      vat: v,
      total_premium: total,
      commission_percent: commPercent,
      commission_baht: parseFloat((net * (commPercent / 100)).toFixed(2))
    });
  };

  const onDrop = (acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      type_id: 6, // default "อื่นๆ"
      note: '',
      preview: URL.createObjectURL(file)
    }));
    setFiles([...files, ...newFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const updateFileData = (index, field, value) => {
    const newFiles = [...files];
    newFiles[index][field] = value;
    setFiles(newFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      
      const payload = {
        customer,
        vehicle,
        policy,
        payment,
        followUp
      };
      
      formData.append('data', JSON.stringify(payload));

      const fileDataList = files.map(f => ({ type_id: f.type_id, note: f.note }));
      formData.append('fileData', JSON.stringify(fileDataList));

      files.forEach(f => {
        formData.append('files', f.file);
      });

      const res = await api.post('/issue-policy', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMsg({
        text: 'บันทึกข้อมูลลูกค้าและกรมธรรม์สำเร็จ!',
        customerName: `${customer.first_name} ${customer.last_name}`,
        policyNo: policy.policy_no || '(สร้างใหม่อัตโนมัติ)',
        company: policy.company,
        type: policy.category === 'motor' ? policy.type : (nonMotorTypes.find(t => t.value === parseInt(policy.non_motor_type_id))?.label),
        totalPremium: policy.total_premium,
        commission: policy.commission_baht,
        status: followUp.status
      });

      window.scrollTo(0, 0);
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล (Rollback เรียบร้อยแล้ว)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold"><i className="bi bi-file-earmark-plus-fill text-primary"></i> เพิ่มลูกค้าใหม่ / ออกกรมธรรม์ใหม่ (Single Page Form)</h2>
      </div>

      {successMsg && (
        <div className="alert alert-success shadow-sm border-0 mb-4 p-4">
          <h4 className="alert-heading fw-bold"><i className="bi bi-check-circle-fill me-2"></i>{successMsg.text}</h4>
          <hr />
          <Row>
            <Col md={4}><p className="mb-1"><strong>ลูกค้า:</strong> {successMsg.customerName}</p></Col>
            <Col md={4}><p className="mb-1"><strong>เลขกรมธรรม์:</strong> {successMsg.policyNo}</p></Col>
            <Col md={4}><p className="mb-1"><strong>สถานะงาน:</strong> <Badge bg="success">{successMsg.status}</Badge></p></Col>
            <Col md={4}><p className="mb-1"><strong>บริษัทประกัน:</strong> {successMsg.company}</p></Col>
            <Col md={4}><p className="mb-1"><strong>ประเภท:</strong> {successMsg.type}</p></Col>
            <Col md={4}><p className="mb-0 text-danger fw-bold"><strong>คอมมิชชัน:</strong> ฿{successMsg.commission}</p></Col>
          </Row>
          <div className="mt-3">
            <Button variant="outline-success" className="me-2 fw-bold" onClick={() => window.location.reload()}>+ ออกกรมธรรม์ใหม่</Button>
            <Button variant="primary" className="fw-bold" onClick={() => window.location.href='/dashboard'}>กลับไปหน้า Dashboard</Button>
          </div>
        </div>
      )}

      <Form onSubmit={handleSubmit}>
        <Accordion defaultActiveKey={['0', '1', '2', '3', '4', '5']} alwaysOpen>
          
          {/* Section 1: Customer */}
          <Accordion.Item eventKey="0" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-person-lines-fill me-2"></i>ส่วนที่ 1 : ข้อมูลลูกค้า</h5></Accordion.Header>
            <Accordion.Body>
              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลส่วนตัว</h6>
              <Row className="g-3 mb-4">
                <Col md={2}>
                  <Form.Label>คำนำหน้า</Form.Label>
                  <Form.Select value={customer.prefix} onChange={e => setCustomer({...customer, prefix: e.target.value})}>
                    <option>นาย</option><option>นาง</option><option>นางสาว</option><option>บริษัท</option><option>หจก.</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label>ชื่อ <span className="text-danger">*</span></Form.Label>
                  <Form.Control required type="text" value={customer.first_name} onChange={e => setCustomer({...customer, first_name: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>นามสกุล <span className="text-danger">*</span></Form.Label>
                  <Form.Control required type="text" value={customer.last_name} onChange={e => setCustomer({...customer, last_name: e.target.value})} />
                </Col>
                <Col md={4}>
                  <Form.Label>เลขบัตรประชาชน / เลขนิติบุคคล</Form.Label>
                  <Form.Control type="text" value={customer.id_card_no} onChange={e => setCustomer({...customer, id_card_no: e.target.value})} maxLength={13} />
                </Col>
                <Col md={3}>
                  <Form.Label>วันเดือนปีเกิด</Form.Label>
                  <Form.Control type="date" value={customer.dob} onChange={handleDobChange} />
                </Col>
                <Col md={1}>
                  <Form.Label>อายุ</Form.Label>
                  <Form.Control type="number" readOnly className="bg-light" value={customer.age} />
                </Col>
                <Col md={3}>
                  <Form.Label>เบอร์โทรศัพท์ <span className="text-danger">*</span></Form.Label>
                  <Form.Control required type="text" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
                </Col>
                <Col md={5}>
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} />
                </Col>
                <Col md={4}>
                  <Form.Label>LINE ID</Form.Label>
                  <Form.Control type="text" value={customer.line_id} onChange={e => setCustomer({...customer, line_id: e.target.value})} />
                </Col>
                <Col md={4}>
                  <Form.Label>Facebook</Form.Label>
                  <Form.Control type="text" value={customer.facebook} onChange={e => setCustomer({...customer, facebook: e.target.value})} />
                </Col>
                <Col md={4}>
                  <Form.Label>อาชีพ</Form.Label>
                  <Form.Control type="text" value={customer.occupation} onChange={e => setCustomer({...customer, occupation: e.target.value})} />
                </Col>
              </Row>

              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลที่อยู่</h6>
              <Row className="g-3 mb-4">
                <ThaiAddressSelect 
                  province={customer.province}
                  district={customer.district}
                  sub_district={customer.sub_district}
                  zipcode={customer.zipcode}
                  onChange={(addr) => setCustomer(prev => ({ ...prev, ...addr }))}
                />
                <Col md={2}>
                  <Form.Label>บ้านเลขที่</Form.Label>
                  <Form.Control type="text" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
                </Col>
                <Col md={2}>
                  <Form.Label>หมู่</Form.Label>
                  <Form.Control type="text" value={customer.moo} onChange={e => setCustomer({...customer, moo: e.target.value})} />
                </Col>
                <Col md={4}>
                  <Form.Label>ซอย</Form.Label>
                  <Form.Control type="text" value={customer.soi} onChange={e => setCustomer({...customer, soi: e.target.value})} />
                </Col>
                <Col md={4}>
                  <Form.Label>ถนน</Form.Label>
                  <Form.Control type="text" value={customer.road} onChange={e => setCustomer({...customer, road: e.target.value})} />
                </Col>
              </Row>

              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลเพิ่มเติม</h6>
              <Row className="g-3">
                <Col md={12}>
                  <Form.Label>หมายเหตุลูกค้า</Form.Label>
                  <Form.Control as="textarea" rows={2} value={customer.note} onChange={e => setCustomer({...customer, note: e.target.value})} />
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Type Selection before Vehicle */}
          <Card className="mb-3 border-0 shadow-sm rounded">
            <Card.Body className="bg-light">
              <div className="d-flex align-items-center">
                <h5 className="mb-0 fw-bold me-4">ประเภทกรมธรรม์ที่ต้องการออก:</h5>
                <Form.Check inline type="radio" label={<span className="fw-bold">🚗 Motor Insurance (รถยนต์)</span>} name="policyCategory" checked={policy.category === 'motor'} onChange={() => setPolicy({...policy, category: 'motor'})} id="cat-motor" className="me-4" />
                <Form.Check inline type="radio" label={<span className="fw-bold">🏢 Non-Motor Insurance (ประกันอื่น)</span>} name="policyCategory" checked={policy.category === 'non-motor'} onChange={() => setPolicy({...policy, category: 'non-motor'})} id="cat-nm" />
              </div>
            </Card.Body>
          </Card>

          {/* Section 2: Vehicle (Conditional) */}
          {policy.category === 'motor' && (
            <Accordion.Item eventKey="1" className="mb-3 border-0 shadow-sm rounded">
              <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-car-front-fill me-2"></i>ส่วนที่ 2 : ข้อมูลรถยนต์</h5></Accordion.Header>
              <Accordion.Body>
                <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลรถ และ ทะเบียน</h6>
                <Row className="g-3 mb-4">
                  <Col md={3}>
                    <Form.Label>ประเภทรถ</Form.Label>
                    <Select options={vehicleTypes} value={vehicleTypes.find(t => t.value === vehicle.vehicle_type)} onChange={opt => setVehicle({...vehicle, vehicle_type: opt?.value || ''})} isClearable />
                  </Col>
                  <Col md={3}>
                    <Form.Label>ยี่ห้อรถ (Brand)</Form.Label>
                    <Form.Control type="text" value={vehicle.brand} onChange={e => setVehicle({...vehicle, brand: e.target.value})} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>รุ่นรถ (Model)</Form.Label>
                    <Form.Control type="text" value={vehicle.model} onChange={e => setVehicle({...vehicle, model: e.target.value})} />
                  </Col>
                  <Col md={1}>
                    <Form.Label>ปีรถ</Form.Label>
                    <Form.Control type="text" value={vehicle.year} onChange={e => setVehicle({...vehicle, year: e.target.value})} />
                  </Col>
                  <Col md={2}>
                    <Form.Label>สีรถ</Form.Label>
                    <Form.Control type="text" value={vehicle.color} onChange={e => setVehicle({...vehicle, color: e.target.value})} />
                  </Col>
                  
                  <Col md={3}>
                    <Form.Label>เลขทะเบียน <span className="text-danger">*</span></Form.Label>
                    <Form.Control required={policy.category === 'motor'} type="text" value={vehicle.plate_no} onChange={e => setVehicle({...vehicle, plate_no: e.target.value})} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>จังหวัดทะเบียนรถ</Form.Label>
                    <Select options={provinces} value={provinces.find(p => p.value === vehicle.plate_province)} onChange={opt => setVehicle({...vehicle, plate_province: opt?.value || ''})} isClearable />
                  </Col>
                </Row>

                <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลทางเทคนิค</h6>
                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <Form.Label>เลขตัวถัง (VIN / Chassis No)</Form.Label>
                    <Form.Control type="text" value={vehicle.vin} onChange={e => setVehicle({...vehicle, vin: e.target.value})} />
                  </Col>
                  <Col md={6}>
                    <Form.Label>เลขเครื่องยนต์</Form.Label>
                    <Form.Control type="text" value={vehicle.engine_no} onChange={e => setVehicle({...vehicle, engine_no: e.target.value})} />
                  </Col>
                </Row>

                <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">ข้อมูลภาษี และ พ.ร.บ.</h6>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Label>ทุนประกันรถ</Form.Label>
                    <Form.Control type="number" step="0.01" value={vehicle.sum_insured} onChange={e => setVehicle({...vehicle, sum_insured: e.target.value})} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>วันภาษีรถหมดอายุ</Form.Label>
                    <Form.Control type="date" value={vehicle.tax_expiry} onChange={e => setVehicle({...vehicle, tax_expiry: e.target.value})} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>วันเริ่มคุ้มครอง พ.ร.บ.</Form.Label>
                    <Form.Control type="date" value={policy.prb_start_date} onChange={e => setPolicy({...policy, prb_start_date: e.target.value})} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>วันสิ้นสุดคุ้มครอง พ.ร.บ.</Form.Label>
                    <Form.Control type="date" value={policy.prb_expiry_date} onChange={e => setPolicy({...policy, prb_expiry_date: e.target.value})} />
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {/* Section 3: Policy */}
          <Accordion.Item eventKey="2" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-shield-check me-2"></i>ส่วนที่ 3 : ข้อมูลกรมธรรม์</h5></Accordion.Header>
            <Accordion.Body>
              <h6 className="text-primary fw-bold border-bottom pb-2 mb-3">รายละเอียดกรมธรรม์</h6>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Form.Label>บริษัทประกัน <span className="text-danger">*</span></Form.Label>
                  <Select required options={companies} value={companies.find(c => c.value === policy.company)} onChange={opt => setPolicy({...policy, company: opt?.value || ''})} isClearable />
                </Col>
                {policy.category === 'motor' ? (
                  <Col md={4}>
                    <Form.Label>ประเภทประกันรถยนต์ <span className="text-danger">*</span></Form.Label>
                    <Form.Select required value={policy.type} onChange={e => setPolicy({...policy, type: e.target.value})}>
                      <option value="">เลือกประเภท...</option>
                      <option value="ประกันภัยชั้น 1">ประกันภัยชั้น 1</option>
                      <option value="ประกันภัยชั้น 2+">ประกันภัยชั้น 2+</option>
                      <option value="ประกันภัยชั้น 2">ประกันภัยชั้น 2</option>
                      <option value="ประกันภัยชั้น 3+">ประกันภัยชั้น 3+</option>
                      <option value="ประกันภัยชั้น 3">ประกันภัยชั้น 3</option>
                      <option value="พ.ร.บ. อย่างเดียว">พ.ร.บ. อย่างเดียว</option>
                    </Form.Select>
                  </Col>
                ) : (
                  <Col md={4}>
                    <Form.Label>ประเภท Non-Motor <span className="text-danger">*</span></Form.Label>
                    <Select required options={nonMotorTypes} value={nonMotorTypes.find(t => t.value === parseInt(policy.non_motor_type_id))} onChange={opt => setPolicy({...policy, non_motor_type_id: opt?.value || ''})} isClearable />
                  </Col>
                )}
                <Col md={4}>
                  <Form.Label>เลขกรมธรรม์</Form.Label>
                  <Form.Control type="text" value={policy.policy_no} onChange={e => setPolicy({...policy, policy_no: e.target.value})} placeholder="เว้นว่างเพื่อสร้าง Auto" />
                </Col>

                {policy.category === 'non-motor' && (
                  <>
                    <Col md={6}>
                      <Form.Label>ชื่อผู้เอาประกัน (ถ้าไม่ระบุ จะใช้ชื่อลูกค้า)</Form.Label>
                      <Form.Control type="text" value={policy.insured_name} onChange={e => setPolicy({...policy, insured_name: e.target.value})} />
                    </Col>
                    <Col md={6}>
                      <Form.Label>ทุนประกันรวม</Form.Label>
                      <Form.Control type="number" step="0.01" value={policy.sum_insured} onChange={e => setPolicy({...policy, sum_insured: e.target.value})} />
                    </Col>
                  </>
                )}

                <Col md={6}>
                  <Form.Label>วันเริ่มคุ้มครอง (กรมธรรม์)</Form.Label>
                  <Form.Control type="date" value={policy.start_date} onChange={e => setPolicy({...policy, start_date: e.target.value})} />
                </Col>
                <Col md={6}>
                  <Form.Label>วันสิ้นสุดคุ้มครอง (กรมธรรม์)</Form.Label>
                  <Form.Control type="date" value={policy.expiry_date} onChange={e => setPolicy({...policy, expiry_date: e.target.value})} />
                </Col>
              </Row>

              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h6 className="text-primary fw-bold mb-0">ข้อมูลเบี้ยประกันและการคำนวณ</h6>
                <Button variant="outline-success" size="sm" onClick={calculatePremiumsAndComm}><i className="bi bi-calculator"></i> คำนวณเบี้ย + คอมฯ อัตโนมัติ</Button>
              </div>
              
              <Row className="g-3">
                <Col md={3}>
                  <Form.Label>เบี้ยสุทธิ <span className="text-danger">*</span></Form.Label>
                  <Form.Control required type="number" step="0.01" value={policy.net_premium} onChange={e => setPolicy({...policy, net_premium: e.target.value})} onBlur={calculatePremiumsAndComm} />
                </Col>
                <Col md={2}>
                  <Form.Label>อากร</Form.Label>
                  <Form.Control type="number" step="0.01" value={policy.stamp_duty} onChange={e => setPolicy({...policy, stamp_duty: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>VAT</Form.Label>
                  <Form.Control type="number" step="0.01" value={policy.vat} onChange={e => setPolicy({...policy, vat: e.target.value})} />
                </Col>
                <Col md={4}>
                  <Form.Label className="fw-bold text-success">เบี้ยรวม (Total)</Form.Label>
                  <Form.Control type="number" step="0.01" className="bg-light fw-bold text-success" value={policy.total_premium} onChange={e => setPolicy({...policy, total_premium: e.target.value})} />
                </Col>

                <Col md={12} className="mt-4"><hr/></Col>

                <Col md={4}>
                  <Form.Label>เปอร์เซ็นต์คอมมิชชัน (%)</Form.Label>
                  <Form.Control type="number" step="0.01" value={policy.commission_percent || ''} onChange={e => setPolicy({...policy, commission_percent: e.target.value})} onBlur={calculatePremiumsAndComm}/>
                </Col>
                <Col md={4}>
                  <Form.Label className="fw-bold text-danger">ค่าคอมมิชชัน (บาท)</Form.Label>
                  <Form.Control type="number" step="0.01" className="bg-light fw-bold text-danger" value={policy.commission_baht || ''} onChange={e => setPolicy({...policy, commission_baht: e.target.value})} />
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Section 4: Payment */}
          <Accordion.Item eventKey="3" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-wallet2 me-2"></i>ส่วนที่ 4 : การชำระเงิน</h5></Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Label>วิธีชำระเงิน <span className="text-danger">*</span></Form.Label>
                  <Select options={paymentMethods} value={paymentMethods.find(p => p.value === payment.payment_method)} onChange={opt => setPayment({...payment, payment_method: opt?.value || 'เงินสด'})} />
                </Col>
                <Col md={3}>
                  <Form.Label>จำนวนงวด</Form.Label>
                  <Form.Control type="number" min="1" value={payment.installments} onChange={e => setPayment({...payment, installments: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>วันที่ชำระเงิน</Form.Label>
                  <Form.Control type="date" value={payment.pay_date} onChange={e => setPayment({...payment, pay_date: e.target.value})} />
                </Col>
                <Col md={3}>
                  <Form.Label>สถานะการชำระเงิน</Form.Label>
                  <Form.Select value={payment.status} onChange={e => setPayment({...payment, status: e.target.value})}>
                    <option value="รอดำเนินการ">รอดำเนินการ</option>
                    <option value="ชำระแล้ว (บางส่วน)">ชำระแล้ว (บางส่วน)</option>
                    <option value="ชำระครบแล้ว">ชำระครบแล้ว</option>
                  </Form.Select>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Section 5: Follow Up */}
          <Accordion.Item eventKey="4" className="mb-3 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-calendar-check me-2"></i>ส่วนที่ 5 : งานติดตาม</h5></Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>สถานะงาน (Policy Status) <span className="text-danger">*</span></Form.Label>
                  <Select options={jobStatuses} value={jobStatuses.find(j => j.value === followUp.status)} onChange={opt => setFollowUp({...followUp, status: opt?.value || 'รอดำเนินการ'})} />
                </Col>
                <Col md={4}>
                  <Form.Label>วันที่ติดตามครั้งถัดไป</Form.Label>
                  <Form.Control type="date" value={followUp.next_date} onChange={e => setFollowUp({...followUp, next_date: e.target.value})} />
                </Col>
                <Col md={4}>
                  <Form.Label>ผู้ดูแลลูกค้า (Sales)</Form.Label>
                  <Form.Control type="text" value="(อ้างอิงตามแอคเคาท์ปัจจุบัน)" disabled className="bg-light" />
                </Col>
                <Col md={12}>
                  <Form.Label>หมายเหตุติดตามงาน</Form.Label>
                  <Form.Control as="textarea" rows={2} value={followUp.note} onChange={e => setFollowUp({...followUp, note: e.target.value})} />
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Section 6: Attachments */}
          <Accordion.Item eventKey="5" className="mb-4 border-0 shadow-sm rounded">
            <Accordion.Header><h5 className="mb-0 fw-bold"><i className="bi bi-paperclip me-2"></i>ส่วนที่ 6 : เอกสารแนบ</h5></Accordion.Header>
            <Accordion.Body>
              <div {...getRootProps()} className={`p-5 mb-4 text-center border rounded-3 ${isDragActive ? 'bg-primary text-white border-primary' : 'bg-light border-dashed'}`} style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: 'pointer' }}>
                <input {...getInputProps()} />
                <i className="bi bi-cloud-arrow-up-fill" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</h5>
                <p className="mb-0 opacity-75">รองรับไฟล์: PDF, JPG, PNG (สูงสุด 10MB/ไฟล์)</p>
              </div>

              {files.length > 0 && (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ไฟล์</th>
                        <th>ประเภทเอกสาร</th>
                        <th>หมายเหตุ</th>
                        <th className="text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((f, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="d-flex align-items-center">
                              {f.file.type.includes('image') ? (
                                <img src={f.preview} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px' }} />
                              ) : (
                                <i className="bi bi-file-earmark-pdf-fill text-danger me-2" style={{ fontSize: '1.5rem' }}></i>
                              )}
                              <span className="text-truncate" style={{ maxWidth: '200px' }} title={f.file.name}>{f.file.name}</span>
                            </div>
                          </td>
                          <td>
                            <Form.Select size="sm" value={f.type_id} onChange={e => updateFileData(idx, 'type_id', e.target.value)}>
                              {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Control size="sm" type="text" placeholder="ระบุเพิ่มเติม..." value={f.note} onChange={e => updateFileData(idx, 'note', e.target.value)} />
                          </td>
                          <td className="text-center">
                            <Button variant="outline-danger" size="sm" onClick={() => removeFile(idx)}><i className="bi bi-trash"></i></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        {/* Action Buttons */}
        <div className="card shadow-sm border-0 sticky-bottom mb-4" style={{ bottom: '1rem', zIndex: 1000 }}>
          <div className="card-body bg-white rounded-3 d-flex justify-content-between align-items-center p-3">
            <div>
              <Button variant="outline-secondary" className="me-2 fw-bold" onClick={() => alert('ฟังก์ชันอยู่ระหว่างพัฒนา')}><i className="bi bi-file-earmark-text"></i> พิมพ์ใบเสนอราคา</Button>
              <Button variant="outline-secondary" className="me-2 fw-bold" onClick={() => alert('ฟังก์ชันอยู่ระหว่างพัฒนา')}><i className="bi bi-receipt"></i> พิมพ์ใบแจ้งชำระ</Button>
            </div>
            <div>
              <Button variant="outline-primary" className="me-3 fw-bold" onClick={() => setFollowUp({...followUp, status: 'แบบร่าง'})}>
                <i className="bi bi-save"></i> บันทึกแบบร่าง
              </Button>
              <Button variant="success" size="lg" type="submit" disabled={loading} className="fw-bold px-4 shadow-sm">
                {loading ? <><span className="spinner-border spinner-border-sm me-2" /> กำลังบันทึก...</> : <><i className="bi bi-check-circle-fill me-2"></i> บันทึกลูกค้าและกรมธรรม์</>}
              </Button>
            </div>
          </div>
        </div>

      </Form>
    </div>
  );
};

export default IssuePolicyForm;
