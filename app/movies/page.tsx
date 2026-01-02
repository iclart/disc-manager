'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Tag, Grid, Card, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { formatSize, FILE_FORMATS, VIDEO_CODECS, SIZE_UNITS } from '@/lib/utils'
import dayjs from 'dayjs'

const { useBreakpoint } = Grid

type Movie = {
  id: number
  name: string
  size: number | null
  format: string
  codec: string
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

export default function MoviesPage() {
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [movies, setMovies] = useState<Movie[]>([])
  const [discs, setDiscs] = useState<Disc[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchMovies()
    fetchDiscs()
  }, [page, pageSize])

  const fetchMovies = async (sortField?: string, sortOrder?: 'ascend' | 'descend') => {
    setLoading(true)
    try {
      let url = `/api/movies?page=${page}&pageSize=${pageSize}`
      if (sortField && sortOrder) {
        url += `&sortField=${sortField}&sortOrder=${sortOrder}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setMovies(data.data)
      setTotal(data.total)
    } catch (error) {
      message.error('加载影片数据失败')
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
    setEditingMovie(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (movie: Movie) => {
    setEditingMovie(movie)
    // Convert size from KiB to appropriate unit for display
    let sizeValue: number | undefined = undefined
    let sizeUnit = 'MiB'
    if (movie.size !== null && movie.size !== undefined) {
      const gib = movie.size / (1024 * 1024)
      if (gib >= 1) {
        sizeValue = gib
        sizeUnit = 'GiB'
      } else {
        sizeValue = movie.size / 1024
        sizeUnit = 'MiB'
      }
    }
    // For editing, just show the basic info (discs management not in edit modal)
    form.setFieldsValue({
      name: movie.name,
      sizeValue,
      sizeUnit,
      format: movie.format,
      codec: movie.codec,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/movies/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      fetchMovies()
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

      if (editingMovie) {
        await fetch(`/api/movies/${editingMovie.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        message.success('更新成功')
      } else {
        await fetch('/api/movies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchMovies()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true, sorter: true },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number | null) => formatSize(size),
      responsive: ['sm' as const],
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 100,
      responsive: ['md' as const],
    },
    {
      title: '编码',
      dataIndex: 'codec',
      key: 'codec',
      width: 100,
      responsive: ['lg' as const],
    },
    {
      title: '光盘',
      dataIndex: 'discs',
      key: 'discs',
      width: 150,
      render: (discs: Movie['discs']) => {
        if (!discs || discs.length === 0) return '-'
        return (
          <Space size={4} wrap>
            {discs.map((dm, idx) => (
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
      render: (_: any, record: Movie) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const renderMobileCard = (record: Movie) => (
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
          <span style={{ color: '#888' }}>大小: </span>
          {formatSize(record.size)}
        </div>
        <div>
          <span style={{ color: '#888' }}>格式: </span>
          {record.format}
        </div>
        <div>
          <span style={{ color: '#888' }}>编码: </span>
          {record.codec}
        </div>
        <div>
          <span style={{ color: '#888' }}>光盘: </span>
          {(() => {
            if (!record.discs || record.discs.length === 0) return '-'
            return (
              <Space size={4} wrap>
                {record.discs.map((dm, idx) => (
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
            添加影片
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchMovies()} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {isMobile ? (
        <div>
          {movies.map(renderMobileCard)}
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
          dataSource={movies}
          rowKey="id"
          loading={loading}
          onChange={(pagination, filters, sorter) => {
            const sortField = Array.isArray(sorter) ? undefined : sorter.field
            const sortOrder = Array.isArray(sorter) ? undefined : sorter.order
            fetchMovies(sortField as string, sortOrder as 'ascend' | 'descend' | undefined)
          }}
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
        title={editingMovie ? '编辑影片' : '添加影片'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '95%' : undefined}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="影片名称"
            name="name"
            rules={[{ required: true, message: '请输入影片名称' }]}
          >
            <Input placeholder="请输入影片名称" />
          </Form.Item>
          <Form.Item
            label="大小"
            required
          >
            <Input.Group compact>
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
            </Input.Group>
          </Form.Item>
          <Form.Item
            label="文件格式"
            name="format"
            rules={[{ required: true, message: '请选择文件格式' }]}
          >
            <Select options={FILE_FORMATS} placeholder="请选择文件格式" />
          </Form.Item>
          <Form.Item
            label="视频编码"
            name="codec"
            rules={[{ required: true, message: '请选择视频编码' }]}
          >
            <Select options={VIDEO_CODECS} placeholder="请选择视频编码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
