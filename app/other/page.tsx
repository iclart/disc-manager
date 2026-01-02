'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Tag, Grid, Card, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { formatSize, SIZE_UNITS } from '@/lib/utils'
import dayjs from 'dayjs'

const { useBreakpoint } = Grid

type Other = {
  id: number
  name: string
  desc: string
  size: number | null
  discs: Array<{
    disc: { id: number; code: string }
    burnedAt: string
    notes: string | null
  }>
}

type Disc = {
  id: number
  code: string
}

export default function OtherPage() {
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [others, setOthers] = useState<Other[]>([])
  const [discs, setDiscs] = useState<Disc[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingOther, setEditingOther] = useState<Other | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchOthers()
    fetchDiscs()
  }, [page, pageSize])

  const fetchOthers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/other?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      setOthers(data.data)
      setTotal(data.total)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchDiscs = async () => {
    try {
      const res = await fetch('/api/discs?pageSize=1000')
      const data = await res.json()
      setDiscs(data.data)
    } catch (error) {
      console.error('加载光盘数据失败', error)
    }
  }

  const handleAdd = () => {
    setEditingOther(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (other: Other) => {
    setEditingOther(other)
    // Convert size from KiB to appropriate unit for display
    let sizeValue: number | undefined = undefined
    let sizeUnit = 'MiB'
    if (other.size !== null && other.size !== undefined) {
      const gib = other.size / (1024 * 1024)
      if (gib >= 1) {
        sizeValue = gib
        sizeUnit = 'GiB'
      } else {
        sizeValue = other.size / 1024
        sizeUnit = 'MiB'
      }
    }
    form.setFieldsValue({
      name: other.name,
      desc: other.desc,
      sizeValue,
      sizeUnit,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/other/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      fetchOthers()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      // Convert size value + unit to KiB
      let size: number | null = null
      if (values.sizeValue !== undefined && values.sizeValue !== null && values.sizeUnit) {
        const value = parseFloat(values.sizeValue)
        switch (values.sizeUnit) {
          case 'GiB':
            size = Math.round(value * 1024 * 1024)
            break
          case 'MiB':
            size = Math.round(value * 1024)
            break
          case 'KiB':
            size = Math.round(value)
            break
        }
      }

      const payload = {
        ...values,
        size,
        sizeValue: undefined,
        sizeUnit: undefined,
      }

      if (editingOther) {
        await fetch(`/api/other/${editingOther.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        message.success('更新成功')
      } else {
        await fetch('/api/other', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchOthers()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '描述', dataIndex: 'desc', key: 'desc', ellipsis: true, responsive: ['sm' as const] },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number | null) => formatSize(size),
      responsive: ['sm' as const],
    },
    {
      title: '光盘',
      dataIndex: 'disc',
      key: 'disc',
      width: 150,
      render: (disc: any, record: Other) => {
        if (!record.discs || record.discs.length === 0) return '-'
        return (
          <Space size={4} wrap>
            {record.discs.map((dm: any, idx: number) => (
              <Tooltip
                key={idx}
                title={`刻录: ${dayjs(dm.burnedAt).format('YYYY-MM-DD HH:mm')}${dm.notes ? `\n备注: ${dm.notes}` : ''}`}
              >
                <Tag color="blue">{dm.disc.code}</Tag>
              </Tooltip>
            ))}
          </Space>
        )
      },
      responsive: ['sm' as const],
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Other) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const renderMobileCard = (record: Other) => (
    <Card
      key={record.id}
      size="small"
      style={{ marginBottom: 8 }}
      title={<span style={{ fontWeight: 'bold' }}>{record.name}</span>}
      extra={
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>
          <span style={{ color: '#888' }}>描述: </span>
          {record.desc}
        </div>
        <div>
          <span style={{ color: '#888' }}>大小: </span>
          {formatSize(record.size)}
        </div>
        <div>
          <span style={{ color: '#888' }}>光盘: </span>
          {(() => {
            if (!record.discs || record.discs.length === 0) return '-'
            return (
              <Space size={4} wrap>
                {record.discs.map((dm: any, idx: number) => (
                  <Tooltip
                    key={idx}
                    title={`刻录: ${dayjs(dm.burnedAt).format('YYYY-MM-DD HH:mm')}${dm.notes ? `\n备注: ${dm.notes}` : ''}`}
                  >
                    <Tag color="blue">{dm.disc.code}</Tag>
                  </Tooltip>
                ))}
              </Space>
            )
          })()}
        </div>
      </div>
    </Card>
  )

  return (
    <div style={{ padding: isMobile ? 8 : 0 }}>
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} block={isMobile}>
            添加资源
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchOthers} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {isMobile ? (
        <div>
          {others.map(renderMobileCard)}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Space wrap>
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button>
              <span>第 {page} 页，共 {Math.ceil(total / pageSize)} 页</span>
              <Button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)}>下一页</Button>
            </Space>
          </div>
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={others}
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
          scroll={{ x: 700 }}
        />
      )}

      <Modal
        title={editingOther ? '编辑资源' : '添加资源'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '95%' : undefined}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="资源名称"
            name="name"
            rules={[{ required: true, message: '请输入资源名称' }]}
          >
            <Input placeholder="请输入资源名称" />
          </Form.Item>
          <Form.Item
            label="描述"
            name="desc"
          >
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
          <Form.Item
            label="大小"
            required
          >
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="sizeValue"
                rules={[{ required: true, message: '请输入大小' }]}
                noStyle
              >
                <Input
                  type="number"
                  style={{ width: '60%' }}
                  placeholder="输入数值"
                  min={0}
                  step={0.01}
                />
              </Form.Item>
              <Form.Item name="sizeUnit" noStyle initialValue="MiB">
                <Select style={{ width: '40%' }}>
                  {SIZE_UNITS.map(unit => (
                    <Select.Option key={unit.value} value={unit.value}>
                      {unit.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          {/* Discs are now managed through the disc creation/editing interface */}
        </Form>
      </Modal>
    </div>
  )
}
