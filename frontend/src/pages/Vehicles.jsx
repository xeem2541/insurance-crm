import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import VehicleFormModal from '../components/VehicleFormModal';

const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543; // convert to Buddhist Era
  return `${day}/${month}/${year}`;
};

const Vehicles = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null, customer_id: '', vehicle_type: '', brand: '', model: '', year: '', color: '', 
    plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: '', act_expiry: ''
  });

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Vehicles, Customers, and Master Data
  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', debouncedSearch],
    queryFn: async () => {
      const [vehRes, custRes, mdRes] = await Promise.all([
        api.get(`/vehicles?search=${encodeURIComponent(debouncedSearch.trim())}`),
        api.get('/customers?all=true'),
        api.get('/master-data?category=VehicleType')
      ]);
      
      const vehicles = Array.isArray(vehRes.data) ? vehRes.data : (vehRes.data?.data || []);
      const customers = Array.isArray(custRes.data) ? custRes.data : (custRes.data?.data || []);
      const mdList = Array.isArray(mdRes.data) ? mdRes.data : (mdRes.data?.data || []);
      
      const customerOptions = customers.map(c => ({ 
        value: c.id, 
        label: `${c.customer_code || ''} - ${c.first_name || ''} ${c.last_name || ''}`.trim() 
      }));
      const vehicleTypes = mdList.map(m => ({ value: m.value, label: m.value }));
      
      return { vehicles, customerOptions, vehicleTypes };
    }
  });

  const vehicles = data?.vehicles || [];
  const customerOptions = data?.customerOptions || [];
  const vehicleTypes = data?.vehicleTypes || [];

  const saveMutation = useMutation({
    mutationFn: async (formDataToSave) => {
      if (formDataToSave.id) {
        return await api.put(`/vehicles/${formDataToSave.id}`, formDataToSave);
      } else {
        return await api.post('/vehicles', formDataToSave);
      }
    },
    onSuccess: () => {
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  });

  const handleOpenModal = (v = null) => {
    if (v) {
      setFormData({
        id: v.id, customer_id: v.customer_id, vehicle_type: v.vehicle_type, brand: v.brand, 
        model: v.model, year: v.year, color: v.color, plate_no: v.plate_no, plate_province: v.plate_province, 
        vin: v.vin, engine_no: v.engine_no, sum_insured: v.sum_insured, 
        tax_expiry: v.tax_expiry ? v.tax_expiry.split('T')[0] : '', 
        act_expiry: v.act_expiry ? v.act_expiry.split('T')[0] : ''
      });
    } else {
      setFormData({
        id: null, customer_id: '', vehicle_type: '', brand: '', model: '', year: '', color: '', 
        plate_no: '', plate_province: '', vin: '', engine_no: '', sum_insured: '', tax_expiry: '', act_expiry: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if(window.confirm('ยืนยันการลบข้อมูลรถยนต์?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">ข้อมูลรถยนต์ (Vehicles)</h2>
        <button className="btn btn-primary fw-bold" onClick={() => handleOpenModal()}>
          + เพิ่มรถยนต์
        </button>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="position-relative">
            <input 
              type="text" 
              className="form-control form-control-lg pe-5" 
              placeholder="ค้นหาทะเบียนรถ, ชื่อลูกค้า, เลขตัวถัง, ยี่ห้อ, รุ่น..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            {search && (
              <button 
                type="button"
                className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted text-decoration-none me-2"
                onClick={() => setSearch('')}
                style={{ fontSize: '1.2rem', padding: '0 8px' }}
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>ทะเบียนรถ</th>
                <th>ลูกค้า</th>
                <th>ยี่ห้อ/รุ่น</th>
                <th>ประเภทรถ</th>
                <th>วันหมดภาษี</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-4">กำลังโหลดข้อมูล...</td></tr>
              ) : vehicles.length > 0 ? vehicles.map(v => (
                <tr key={v.id}>
                  <td><strong>{v.plate_no} {v.plate_province}</strong></td>
                  <td>{v.first_name} {v.last_name}</td>
                  <td>{v.brand} {v.model} ({v.year})</td>
                  <td>{v.vehicle_type}</td>
                  <td>{v.tax_expiry ? formatThaiDate(v.tax_expiry) : '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenModal(v)}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(v.id)}>
                      <i className="bi bi-trash"></i>
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

      <VehicleFormModal
        show={showModal}
        onHide={() => setShowModal(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        customerOptions={customerOptions}
        vehicleTypes={vehicleTypes}
      />
    </div>
  );
};

export default Vehicles;
