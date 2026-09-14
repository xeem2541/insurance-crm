import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, ListGroup, Form, Button, Tabs, Tab, Badge, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { Send, Users, MessageSquare, Megaphone, Settings } from 'lucide-react';

const LineAdmin = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [botPrompt, setBotPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchBotPrompt();
    // Poll for new users/messages every 10 seconds
    const interval = setInterval(() => {
      fetchUsers();
      if (selectedUser) {
        fetchChatHistory(selectedUser.user_id, false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/line-admin/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchChatHistory = async (userId, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get(`/line-admin/chat/${userId}`);
      setChatHistory(Array.isArray(res.data) ? res.data : []);
      if (showLoading) scrollToBottom();
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchBotPrompt = async () => {
    try {
      const res = await api.get('/line-admin/bot-prompt');
      setBotPrompt(res.data?.prompt || '');
    } catch (error) {
      console.error('Error fetching bot prompt:', error);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    fetchChatHistory(user.user_id);
    
    // Clear needs_attention locally to instantly update UI
    if (user.needs_attention) {
      setUsers(users.map(u => u.user_id === user.user_id ? { ...u, needs_attention: 0 } : u));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedUser) return;
    
    setSending(true);
    try {
      await api.post('/line-admin/reply', {
        userId: selectedUser.user_id,
        message: replyMessage
      });
      setReplyMessage('');
      fetchChatHistory(selectedUser.user_id);
    } catch (error) {
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleToggleBot = async () => {
    if (!selectedUser) return;
    const newStatus = !selectedUser.is_bot_paused;
    try {
      await api.post('/line-admin/toggle-bot', {
        userId: selectedUser.user_id,
        isPaused: newStatus
      });
      setSelectedUser({ ...selectedUser, is_bot_paused: newStatus });
      setUsers(users.map(u => u.user_id === selectedUser.user_id ? { ...u, is_bot_paused: newStatus } : u));
    } catch (error) {
      alert('Failed to toggle bot status');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าจะส่งข้อความนี้ไปยังลูกค้าทุกคน?')) return;
    
    setSending(true);
    try {
      await api.post('/line-admin/broadcast', {
        message: broadcastMessage
      });
      alert('Broadcast sent successfully!');
      setBroadcastMessage('');
    } catch (error) {
      alert('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const handleUpdatePrompt = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/line-admin/bot-prompt', {
        prompt: botPrompt
      });
      alert('Prompt updated successfully!');
    } catch (error) {
      alert('Failed to update prompt');
    } finally {
      setSending(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">จัดการ LINE Official Account</h2>
      
      <Tabs defaultActiveKey="chat" id="line-admin-tabs" className="mb-4">
        
        {/* TAB: LIVE CHAT */}
        <Tab eventKey="chat" title={<><MessageSquare size={18} className="me-2" /> Live Chat</>}>
          <Row>
            {/* User List */}
            <Col md={4} lg={3}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">ลูกค้า ({users.length})</h5>
                </Card.Header>
                <ListGroup variant="flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {users.length === 0 && <ListGroup.Item className="text-center text-muted">ไม่พบข้อมูลลูกค้า</ListGroup.Item>}
                  {users.map(user => (
                    <ListGroup.Item 
                      key={user.user_id} 
                      action 
                      active={selectedUser?.user_id === user.user_id}
                      onClick={() => handleUserSelect(user)}
                      className="d-flex align-items-center justify-content-between"
                    >
                      <div className="d-flex align-items-center">
                        <img 
                          src={user.picture_url || 'https://via.placeholder.com/40'} 
                          alt="profile" 
                          className="rounded-circle me-3" 
                          width="40" height="40" 
                          style={{ objectFit: 'cover' }}
                        />
                        <div>
                          <div className="fw-bold">{user.display_name}</div>
                          <small className={selectedUser?.user_id === user.user_id ? 'text-white' : 'text-muted'}>
                            {new Date(user.last_interacted_at).toLocaleDateString('th-TH')}
                          </small>
                        </div>
                      </div>
                      {user.needs_attention === 1 && (
                        <Badge bg="danger" pill>!</Badge>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            </Col>

            {/* Chat Box */}
            <Col md={8} lg={9}>
              {selectedUser ? (
                <Card className="shadow-sm">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <img 
                        src={selectedUser.picture_url || 'https://via.placeholder.com/40'} 
                        alt="profile" 
                        className="rounded-circle me-3" 
                        width="40" height="40" 
                        style={{ objectFit: 'cover' }}
                      />
                      <h5 className="mb-0">{selectedUser.display_name}</h5>
                    </div>
                    <div>
                      <Button 
                        variant={selectedUser.is_bot_paused ? "warning" : "success"}
                        onClick={handleToggleBot}
                        size="sm"
                      >
                        {selectedUser.is_bot_paused ? 'AI ปิดอยู่ (แอดมินตอบ)' : 'AI เปิดอยู่ (Bot ตอบ)'}
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body 
                    style={{ height: '450px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}
                    className="d-flex flex-column"
                  >
                    {loading ? (
                      <div className="text-center my-auto"><Spinner animation="border" /></div>
                    ) : (
                      <>
                        {chatHistory.map(msg => (
                          <div 
                            key={msg.id} 
                            className={`mb-3 p-3 rounded shadow-sm ${
                              msg.role === 'user' ? 'bg-white align-self-start' : 
                              msg.role === 'admin' ? 'bg-primary text-white align-self-end' : 
                              'bg-success text-white align-self-end'
                            }`}
                            style={{ maxWidth: '75%', display: 'inline-block' }}
                          >
                            <div>{msg.message}</div>
                            <div className="text-end mt-1" style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                              {new Date(msg.created_at).toLocaleTimeString('th-TH')}
                              {msg.role === 'model' && ' (AI)'}
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </Card.Body>
                  <Card.Footer>
                    <Form onSubmit={handleSendReply} className="d-flex">
                      <Form.Control
                        type="text"
                        placeholder="พิมพ์ข้อความตอบกลับ..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        disabled={sending || !selectedUser.is_bot_paused}
                      />
                      <Button variant="primary" type="submit" disabled={sending || !replyMessage.trim() || !selectedUser.is_bot_paused} className="ms-2">
                        {sending ? <Spinner size="sm" animation="border" /> : <Send size={18} />}
                      </Button>
                    </Form>
                    {!selectedUser.is_bot_paused && (
                      <div className="text-danger mt-2 text-center" style={{ fontSize: '0.85rem' }}>
                        * ต้องปิดการทำงานของ AI ก่อน จึงจะสามารถส่งข้อความในนามแอดมินได้
                      </div>
                    )}
                  </Card.Footer>
                </Card>
              ) : (
                <Card className="shadow-sm h-100">
                  <Card.Body className="d-flex align-items-center justify-content-center text-muted">
                    <h5>เลือกลูกค้าทางซ้ายมือเพื่อเริ่มการสนทนา</h5>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </Tab>

        {/* TAB: BROADCAST */}
        <Tab eventKey="broadcast" title={<><Megaphone size={18} className="me-2" /> Broadcast</>}>
          <Card className="shadow-sm max-w-2xl mx-auto" style={{ maxWidth: '800px' }}>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">ส่งข้อความประกาศหาทุกคน (Broadcast)</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSendBroadcast}>
                <Form.Group className="mb-3">
                  <Form.Label>ข้อความ (Text Message)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    placeholder="พิมพ์ข้อความที่คุณต้องการส่งหาลูกค้าทุกคน (เช่น โปรโมชั่น, ประกาศวันหยุด)..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                  />
                </Form.Group>
                <div className="text-end">
                  <Button variant="primary" type="submit" disabled={sending || !broadcastMessage.trim()}>
                    {sending ? <Spinner size="sm" animation="border" /> : <><Send size={18} className="me-2"/> ส่ง Broadcast</>}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        {/* TAB: BOT SETTINGS */}
        <Tab eventKey="settings" title={<><Settings size={18} className="me-2" /> Bot Settings</>}>
          <Card className="shadow-sm" style={{ maxWidth: '800px' }}>
            <Card.Header className="bg-dark text-white">
              <h5 className="mb-0">ตั้งค่าพฤติกรรม AI (System Prompt)</h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">
                คุณสามารถปรับแต่งคำสั่งให้แอดมินเปิ้ล (AI) ได้ที่นี่ เช่น สั่งให้เน้นขายของ, สั่งให้ตอบสุภาพมากขึ้น, หรือใส่ข้อมูลโปรโมชั่นใหม่ๆ ให้ AI รู้จัก
              </p>
              <Form onSubmit={handleUpdatePrompt}>
                <Form.Group className="mb-3">
                  <Form.Control
                    as="textarea"
                    rows={12}
                    value={botPrompt}
                    onChange={(e) => setBotPrompt(e.target.value)}
                    required
                  />
                </Form.Group>
                <div className="text-end">
                  <Button variant="dark" type="submit" disabled={sending}>
                    {sending ? <Spinner size="sm" animation="border" /> : 'บันทึกการตั้งค่า AI'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

      </Tabs>
    </Container>
  );
};

export default LineAdmin;
