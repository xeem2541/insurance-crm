import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/th';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';

moment.locale('th');
const localizer = momentLocalizer(moment);

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await api.get('/policies');
      const policies = res.data;
      
      const calendarEvents = policies.map(p => ({
        id: p.id,
        title: `${p.first_name} ${p.last_name} (${p.plate_no || 'ไม่ระบุทะเบียน'}) - ${p.company}`,
        start: new Date(p.expiry_date),
        end: new Date(p.expiry_date),
        allDay: true,
        resource: p
      }));

      setEvents(calendarEvents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching policies for calendar:', error);
      setLoading(false);
    }
  };

  const eventStyleGetter = (event, start, end, isSelected) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const eventDate = new Date(event.start);
    eventDate.setHours(0,0,0,0);
    
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let backgroundColor = '#3174ad'; // Default blue
    
    if (diffDays < 0) {
      backgroundColor = '#6c757d'; // Expired (Grey)
    } else if (diffDays <= 30) {
      backgroundColor = '#dc3545'; // Expiring soon < 30 days (Red)
    } else if (diffDays <= 90) {
      backgroundColor = '#ffc107'; // Expiring < 90 days (Yellow)
    } else {
      backgroundColor = '#28a745'; // Safe (Green)
    }

    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.8,
      color: diffDays > 30 && diffDays <= 90 ? 'black' : 'white', // yellow bg needs black text
      border: '0px',
      display: 'block'
    };
    
    return {
      style
    };
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold"><i className="bi bi-calendar3 text-primary me-2"></i> ปฏิทินแจ้งเตือนต่ออายุ</h2>
        <div>
          <span className="badge bg-danger me-2">หมดอายุภายใน 30 วัน</span>
          <span className="badge bg-warning text-dark me-2">หมดอายุภายใน 90 วัน</span>
          <span className="badge bg-success me-2">ยังไม่หมดอายุ</span>
          <span className="badge bg-secondary">หมดอายุแล้ว</span>
        </div>
      </div>
      
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div style={{ height: '700px' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                views={['month', 'agenda']}
                messages={{
                  next: "ถัดไป",
                  previous: "ก่อนหน้า",
                  today: "วันนี้",
                  month: "เดือน",
                  agenda: "กำหนดการ",
                  noEventsInRange: "ไม่มีกรมธรรม์หมดอายุในช่วงเวลานี้"
                }}
                onSelectEvent={event => alert(`ลูกค้า: ${event.title}\nวันหมดอายุ: ${moment(event.start).format('DD/MM/YYYY')}`)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
