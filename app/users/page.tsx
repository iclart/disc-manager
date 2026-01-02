'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message, Tag, Grid, Card, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, LogoutOutlined, LockOutlined, SettingOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { formatSize, SIZE_UNITS } from '@/lib/utils'
import dayjs from 'dayjs'

const { useBreakpoint } = Grid

type User = {
  id: number
  username: string
  createdAt: string
  updatedAt: string
}

type CurrentUser = {
  id: number
  username: string
}

type SystemConfig = {
  id: number
  allowRegistration: boolean
}

export default function UsersPage() {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()

  useEffect(() => {
    fetchCurrentUser()
    fetchSystemConfig()
    fetchUsers()
  }, [page, pageSize])

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
      } else {
        router.push('/login')
      }
    } catch (error) {
      router.push('/login')
    }
  }

  const fetchSystemConfig = async () => {
    try {
      const res = await fetch('/api/system/config')
      if (res.ok) {
        const data = await res.json()
        setSystemConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch system config:', error)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?page=${page}&pageSize=${pageSize}`)
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json()
      setUsers(data.data)
      setTotal(data.data.length)
    } catch (error) {
      message.error('加载用户数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({ username: user.username })
    setModalVisible(true)
  }

  const handleChangePassword = (user: User) => {
    setEditingUser(user)
    passwordForm.resetFields()
    setPasswordModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      fetchUsers()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      message.success('已退出登录')
      router.push('/login')
    } catch (error) {
      message.error('退出登录失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (res.ok) {
          message.success('更新成功')
        } else {
          const data = await res.json()
          message.error(data.error || '更新失败')
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (res.ok) {
          message.success('创建成功')
        } else {
          const data = await res.json()
          message.error(data.error || '创建失败')
        }
      }
      setModalVisible(false)
      fetchUsers()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handlePasswordSubmit = async () => {
    if (!editingUser) return

    try {
      const values = await passwordForm.validateFields()

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.password }),
      })

      if (res.ok) {
        message.success('密码修改成功')
        setPasswordModalVisible(false)
        passwordForm.resetFields()
      } else {
        const data = await res.json()
        message.error(data.error || '修改失败')
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleToggleRegistration = async (checked: boolean) => {
    try {
      const res = await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowRegistration: checked }),
      })

      if (res.ok) {
        const data = await res.json()
        setSystemConfig(data.config)
        message.success(checked ? '已开启用户注册' : '已关闭用户注册')
      } else {
        message.error('更新失败')
      }
    } catch (error) {
      message.error('更新失败')
    }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      responsive: ['sm' as const],
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="link" size="small" icon={<LockOutlined />} onClick={() => handleChangePassword(record)} />
          {record.id !== currentUser?.id && (
            <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const renderMobileCard = (record: User) => (
    <Card
      key={record.id}
      size="small"
      style={{ marginBottom: 8 }}
      title={
        <Space>
          <span style={{ fontWeight: 'bold' }}>{record.username}</span>
          {record.id === currentUser?.id && <Tag color="blue">当前用户</Tag>}
        </Space>
      }
      extra={
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="link" size="small" icon={<LockOutlined />} onClick={() => handleChangePassword(record)} />
          {record.id !== currentUser?.id && (
            <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>
          <span style={{ color: '#888' }}>创建时间: </span>
          {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
        </div>
      </div>
    </Card>
  )

  return (
    <div style={{ padding: isMobile ? 8 : 0 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2>用户管理</h2>
        <Space wrap>
          {systemConfig && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SettingOutlined />
              <span>允许注册:</span>
              <Switch
                checked={systemConfig.allowRegistration}
                onChange={handleToggleRegistration}
                checkedChildren="开"
                unCheckedChildren="关"
              />
            </div>
          )}
          <span style={{ color: '#888' }}>
            当前用户: <Tag color="blue">{currentUser?.username}</Tag>
          </span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加用户</Button>
        </Space>
      </div>

      {isMobile ? (
        <div>
          {users.map(renderMobileCard)}
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            total,
            current: page,
            pageSize,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps || 10)
            },
          }}
          scroll={{ x: 600 }}
        />
      )}

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '95%' : undefined}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onOk={handlePasswordSubmit}
        onCancel={() => setPasswordModalVisible(false)}
        width={isMobile ? '95%' : undefined}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            label="新密码"
            name="password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请确认密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
