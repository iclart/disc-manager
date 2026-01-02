'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Tag, Collapse, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined, AppstoreOutlined, ReloadOutlined } from '@ant-design/icons'
import { formatSize, SIZE_UNITS } from '@/lib/utils'
import dayjs from 'dayjs'

type Photo = {
  id: number
  name: string
  size: number | null
  volumes: Volume[]
}

type Volume = {
  id: number
  vol: number
  size: number | null
  discs: Array<{
    disc: { id: number; code: string }
    burnedAt: string
    notes: string | null
  }>
}

type DiscDistribution = {
  discCode: string
  volumes: Volume[]
}

type Disc = {
  id: number
  code: string
}

export default function PhotoPage() {
  const [photoList, setPhotoList] = useState<Photo[]>([])
  const [discs, setDiscs] = useState<Disc[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [volumeModalVisible, setVolumeModalVisible] = useState(false)
  const [distributionModalVisible, setDistributionModalVisible] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [editingVolume, setEditingVolume] = useState<Volume | null>(null)
  const [distributionData, setDistributionData] = useState<DiscDistribution[]>([])
  const [form] = Form.useForm()
  const [volumeForm] = Form.useForm()

  useEffect(() => {
    fetchPhotos()
    fetchDiscs()
  }, [page, pageSize])

  const fetchPhotos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/photo?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      setPhotoList(data.data)
      setTotal(data.total)
    } catch (error) {
      message.error('加载写真数据失败')
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
    setEditingPhoto(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (photo: Photo) => {
    setEditingPhoto(photo)
    form.setFieldsValue({ name: photo.name })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/photo/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      fetchPhotos()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingPhoto) {
        await fetch(`/api/photo/${editingPhoto.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        message.success('更新成功')
      } else {
        await fetch('/api/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, volumes: [] }),
        })
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchPhotos()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const showVolumes = (photo: Photo) => {
    setSelectedPhoto(photo)
    setVolumeModalVisible(true)
  }

  const showDistribution = (photo: Photo) => {
    // Group volumes by disc
    const discMap = new Map<string, DiscDistribution>()

    photo.volumes.forEach(vol => {
      if (vol.discs && vol.discs.length > 0) {
        vol.discs.forEach(dv => {
          if (!discMap.has(dv.disc.code)) {
            discMap.set(dv.disc.code, {
              discCode: dv.disc.code,
              volumes: [],
            })
          }
          discMap.get(dv.disc.code)!.volumes.push(vol)
        })
      }
    })

    // Add unassigned volumes
    const unassigned = photo.volumes.filter(vol => !vol.discs || vol.discs.length === 0)
    if (unassigned.length > 0) {
      discMap.set('未分配', {
        discCode: '未分配',
        volumes: unassigned,
      })
    }

    setDistributionData(Array.from(discMap.values()))
    setDistributionModalVisible(true)
  }

  const handleAddVolume = () => {
    setEditingVolume(null)
    volumeForm.resetFields()
  }

  const handleEditVolume = (volume: Volume) => {
    setEditingVolume(volume)
    // Convert size from KiB to appropriate unit for display
    let sizeValue: number | undefined = undefined
    let sizeUnit = 'MiB'
    if (volume.size !== null && volume.size !== undefined) {
      const gib = volume.size / (1024 * 1024)
      if (gib >= 1) {
        sizeValue = gib
        sizeUnit = 'GiB'
      } else {
        sizeValue = volume.size / 1024
        sizeUnit = 'MiB'
      }
    }
    volumeForm.setFieldsValue({
      vol: volume.vol,
      sizeValue,
      sizeUnit,
      discId: volume.discs?.[0]?.disc.id,
    })
  }

  const handleDeleteVolume = async (id: number) => {
    try {
      await fetch(`/api/volumes/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      fetchPhotos()
      if (selectedPhoto) {
        const res = await fetch(`/api/photo/${selectedPhoto.id}`)
        const data = await res.json()
        setSelectedPhoto(data)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleVolumeSubmit = async () => {
    if (!selectedPhoto) return

    try {
      const values = await volumeForm.validateFields()
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

      if (editingVolume) {
        await fetch(`/api/volumes/${editingVolume.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        message.success('更新成功')
      } else {
        await fetch(`/api/photo/${selectedPhoto.id}/volumes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        message.success('添加成功')
      }
      volumeForm.resetFields()
      fetchPhotos()
      const res = await fetch(`/api/photo/${selectedPhoto.id}`)
      const data = await res.json()
      setSelectedPhoto(data)
    } catch (error) {
      message.error('操作失败')
    }
  }

  const expandedRowRender = (record: Photo) => {
    const columns = [
      { title: '期数', dataIndex: 'vol', key: 'vol', width: 80 },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        width: 120,
        render: (size: number | null) => formatSize(size),
      },
      {
        title: '光盘',
        dataIndex: 'disc',
        key: 'disc',
        width: 150,
        render: (disc: any, record: Volume) => {
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
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_: any, record: Volume) => (
          <Space size="small">
            <Button type="link" size="small" onClick={() => handleEditVolume(record)}>
              编辑
            </Button>
            <Popconfirm title="确认删除?" onConfirm={() => handleDeleteVolume(record.id)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ]

    return (
      <Table
        columns={columns}
        dataSource={record.volumes}
        rowKey="id"
        pagination={false}
        size="small"
      />
    )
  }

  const columns = [
    { title: '写真名称', dataIndex: 'name', key: 'name' },
    {
      title: '总大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number | null) => formatSize(size),
    },
    {
      title: '期数',
      dataIndex: 'volumes',
      key: 'volumes',
      width: 100,
      render: (volumes: Volume[]) => volumes.length,
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      render: (_: any, record: Photo) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={() => showVolumes(record)}
          >
            期数
          </Button>
          <Button
            type="link"
            size="small"
            icon={<AppstoreOutlined />}
            onClick={() => showDistribution(record)}
          >
            分布
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除? 删除写真将同时删除所有期数" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加写真
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchPhotos} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={photoList}
        rowKey="id"
        loading={loading}
        expandable={{
          expandedRowRender,
          defaultExpandedRowKeys: [],
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
      />

      <Modal
        title={editingPhoto ? '编辑写真' : '添加写真'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="写真名称"
            name="name"
            rules={[{ required: true, message: '请输入写真名称' }]}
          >
            <Input placeholder="请输入写真名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`期数管理 - ${selectedPhoto?.name}`}
        open={volumeModalVisible}
        onCancel={() => setVolumeModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16, background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
            {editingVolume ? '编辑期数' : '添加期数'}
          </div>
          <Form form={volumeForm} layout="inline" onFinish={handleVolumeSubmit}>
            <Form.Item name="vol" label="期数" rules={[{ required: true }]}>
              <Input type="number" style={{ width: 80 }} />
            </Form.Item>
            <Form.Item label="大小" required>
              <Input.Group compact>
                <Form.Item
                  name="sizeValue"
                  rules={[{ required: true, message: '请输入大小' }]}
                  noStyle
                >
                  <Input
                    type="number"
                    style={{ width: 80 }}
                    placeholder="数值"
                    min={0}
                    step={0.01}
                  />
                </Form.Item>
                <Form.Item name="sizeUnit" noStyle initialValue="MiB">
                  <Select style={{ width: 80 }}>
                    {SIZE_UNITS.map(unit => (
                      <Select.Option key={unit.value} value={unit.value}>
                        {unit.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Input.Group>
            </Form.Item>
            {/* Discs are now managed through the disc creation/editing interface */}
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingVolume ? '更新' : '添加'}
              </Button>
            </Form.Item>
            {editingVolume && (
              <Form.Item>
                <Button onClick={() => { volumeForm.resetFields(); setEditingVolume(null) }}>
                  取消
                </Button>
              </Form.Item>
            )}
          </Form>
        </div>
        <Table
          columns={[
            { title: '期数', dataIndex: 'vol', width: 80 },
            { title: '大小', dataIndex: 'size', render: (s: number) => formatSize(s) },
            {
              title: '光盘',
              dataIndex: 'disc',
              width: 100,
              render: (d: any) => d ? <Tag>{d.code}</Tag> : '-',
            },
            {
              title: '操作',
              width: 150,
              render: (_: any, record: Volume) => (
                <Space>
                  <Button type="link" size="small" onClick={() => handleEditVolume(record)}>
                    编辑
                  </Button>
                  <Popconfirm title="确认删除?" onConfirm={() => handleDeleteVolume(record.id)}>
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          dataSource={selectedPhoto?.volumes || []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Modal>

      <Modal
        title={`光盘分布 - ${selectedPhoto?.name}`}
        open={distributionModalVisible}
        onCancel={() => setDistributionModalVisible(false)}
        footer={null}
        width={700}
      >
        <Collapse
          items={distributionData.map(d => ({
            key: d.discCode,
            label: (
              <Space>
                <Tag color={d.discCode === '未分配' ? 'default' : 'blue'}>{d.discCode}</Tag>
                <span>{d.volumes.length} 期</span>
              </Space>
            ),
            children: (
              <Table
                columns={[
                  { title: '期数', dataIndex: 'vol', width: 60 },
                  { title: '大小', dataIndex: 'size', render: (s: number) => formatSize(s) },
                ]}
                dataSource={d.volumes}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ),
          }))}
        />
      </Modal>
    </div>
  )
}
