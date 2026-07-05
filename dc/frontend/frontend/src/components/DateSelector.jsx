import React from 'react';
import { Form } from 'react-bootstrap';

const DateSelector = ({ value, onChange }) => {
  const initialParts = value ? value.split('-') : ['', '', ''];
  const [y, setY] = React.useState(initialParts[0]);
  const [m, setM] = React.useState(initialParts[1] ? parseInt(initialParts[1], 10).toString() : '');
  const [d, setD] = React.useState(initialParts[2] ? parseInt(initialParts[2], 10).toString() : '');
  const [lastEmitted, setLastEmitted] = React.useState(value || '');

  React.useEffect(() => {
    if (value !== lastEmitted) {
      const parts = value ? value.split('-') : ['', '', ''];
      setY(parts[0] || '');
      setM(parts[1] ? parseInt(parts[1], 10).toString() : '');
      setD(parts[2] ? parseInt(parts[2], 10).toString() : '');
      setLastEmitted(value || '');
    }
  }, [value, lastEmitted]);

  const currentYear = new Date().getFullYear();
  // Range: 100 years past to 10 years future
  const years = Array.from({length: 111}, (_, i) => currentYear + 10 - i);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const fullMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const days = Array.from({length: 31}, (_, i) => i + 1);

  const handleChange = (part, val) => {
    let newY = y, newM = m, newD = d;
    if (part === 'y') { newY = val; setY(val); }
    if (part === 'm') { newM = val; setM(val); }
    if (part === 'd') { newD = val; setD(val); }

    let emitVal = '';
    if (newY && newM && newD) {
      emitVal = `${newY}-${newM.padStart(2, '0')}-${newD.padStart(2, '0')}`;
    }
    
    // Only emit if the complete value changed
    if (emitVal !== lastEmitted) {
      setLastEmitted(emitVal);
      onChange(emitVal);
    }
  };

  return (
    <div>
      <div className="d-flex gap-1">
        <Form.Select value={d ? parseInt(d, 10).toString() : ''} onChange={e => handleChange('d', e.target.value)} size="sm">
          <option value="">วัน</option>
          {days.map(day => <option key={day} value={day}>{day}</option>)}
        </Form.Select>
        <Form.Select value={m ? parseInt(m, 10).toString() : ''} onChange={e => handleChange('m', e.target.value)} size="sm">
          <option value="">เดือน</option>
          {months.map((month, idx) => <option key={idx} value={idx+1}>{month}</option>)}
        </Form.Select>
        <Form.Select value={y} onChange={e => handleChange('y', e.target.value)} size="sm">
          <option value="">ปี(ค.ศ.)</option>
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </Form.Select>
      </div>
      {d && m && y && (
        <small className="text-success d-block mt-1 fw-bold">
          <i className="bi bi-calendar-check me-1"></i>
          {`${parseInt(d, 10)} ${fullMonths[parseInt(m, 10) - 1]} พ.ศ. ${parseInt(y, 10) + 543}`}
        </small>
      )}
    </div>
  );
};

export default DateSelector;
