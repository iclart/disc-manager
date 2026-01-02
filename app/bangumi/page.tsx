'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Tag, Collapse, Descriptions, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined, AppstoreOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatSize, FILE_FORMATS, VIDEO_CODECS, SIZE_UNITS } from '@/lib/utils'

const { Panel } = Collapse

type DiscDistribution = {
  discCode: string
  discType: string
  episodes: Episode[]
}

type Bangumi = {
  id: number
  name: string
  size: number | null
  episodes: Episode[]
}

type Episode = {
  id: number
  season: string
  episode: number
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

export default function BangumiPage() {
  const [bangumiList, setBangumiList] = useState<Bangumi[]>([])
  const [discs, setDiscs] = useState<Disc[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [episodeModalVisible, setEpisodeModalVisible] = useState(false)
  const [distributionModalVisible, setDistributionModalVisible] = useState(false)
  const [editingBangumi, setEditingBangumi] = useState<Bangumi | null>(null)
  const [selectedBangumi, setSelectedBangumi] = useState<Bangumi | null>(null)
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null)
  const [distributionData, setDistributionData] = useState<DiscDistribution[]>([])
  const [form] = Form.useForm()
  const [episodeForm] = Form.useForm()

  useEffect(() => {
    fetchBangumi()
    fetchDiscs()
  }, [page, pageSize])

  const fetchBangumi = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bangumi?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      setBangumiList(data.data)
      setTotal(data.total)
    } catch (error) {
      message.error('加载番剧数据失败')
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
    setEditingBangumi(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (bangumi: Bangumi) => {
    setEditingBangumi(bangumi)
    form.setFieldsValue({ name: bangumi.name })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/bangumi/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      fetchBangumi()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingBangumi) {
        await fetch(`/api/bangumi/${editingBangumi.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        message.success('更新成功')
      } else {
        await fetch('/api/bangumi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, episodes: [] }),
        })
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchBangumi()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const showEpisodes = (bangumi: Bangumi) => {
    setSelectedBangumi(bangumi)
    setEpisodeModalVisible(true)
  }

  const showDistribution = (bangumi: Bangumi) => {
    // Group episodes by disc
    const discMap = new Map<string, DiscDistribution>()

    bangumi.episodes.forEach(ep => {
      if (ep.discs && ep.discs.length > 0) {
        ep.discs.forEach(dm => {
          if (!discMap.has(dm.disc.code)) {
            discMap.set(dm.disc.code, {
              discCode: dm.disc.code,
              discType: '', // We'll fetch disc details separately if needed
              episodes: [],
            })
          }
          discMap.get(dm.disc.code)!.episodes.push(ep)
        })
      }
    })

    // Add unassigned episodes
    const unassigned = bangumi.episodes.filter(ep => !ep.discs || ep.discs.length === 0)
    if (unassigned.length > 0) {
      discMap.set('未分配', {
        discCode: '未分配',
        discType: '-',
        episodes: unassigned,
      })
    }

    setDistributionData(Array.from(discMap.values()))
    setDistributionModalVisible(true)
  }

  const handleAddEpisode = () => {
    setEditingEpisode(null)
    episodeForm.resetFields()
  }

  const handleEditEpisode = (episode: Episode) => {
    setEditingEpisode(episode)
    // Convert size from KiB to appropriate unit for display
    let sizeValue: number | undefined = undefined
    let sizeUnit = 'MiB'
    if (episode.size !== null && episode.size !== undefined) {
      const gib = episode.size / (1024 * 1024)
      if (gib >= 1) {
        sizeValue = gib
        sizeUnit = 'GiB'
      } else {
        sizeValue = episode.size / 1024
        sizeUnit = 'MiB'
      }
    }
    episodeForm.setFieldsValue({
      season: episode.season,
      episode: episode.episode,
      sizeValue,
      sizeUnit,
      format: episode.format,
      codec: episode.codec,
      discId: episode.discs?.[0]?.disc.id,
    })
  }

  const handleDeleteEpisode = async (id: number) => {
    try {
      await fetch(`/api/episodes/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      // Refresh bangumi list
      fetchBangumi()
      // Update selected bangumi
      if (selectedBangumi) {
        const res = await fetch(`/api/bangumi/${selectedBangumi.id}`)
        const data = await res.json()
        setSelectedBangumi(data)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleEpisodeSubmit = async () => {
    if (!selectedBangumi) return

    try {
      const values = await episodeForm.validateFields()
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

      if (editingEpisode) {
        await fetch(`/api/episodes/${editingEpisode.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        message.success('更新成功')
      } else {
        await fetch(`/api/bangumi/${selectedBangumi.id}/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        message.success('添加成功')
      }
      episodeForm.resetFields()
      fetchBangumi()
      // Refresh selected bangumi
      const res = await fetch(`/api/bangumi/${selectedBangumi.id}`)
      const data = await res.json()
      setSelectedBangumi(data)
    } catch (error) {
      message.error('操作失败')
    }
  }

  const expandedRowRender = (record: Bangumi) => {
    const columns = [
      { title: '季', dataIndex: 'season', key: 'season', width: 80 },
      { title: '集数', dataIndex: 'episode', key: 'episode', width: 80 },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        width: 120,
        render: (size: number | null) => formatSize(size),
      },
      { title: '格式', dataIndex: 'format', key: 'format', width: 80 },
      { title: '编码', dataIndex: 'codec', key: 'codec', width: 100 },
      {
        title: '光盘',
        dataIndex: 'disc',
        key: 'disc',
        width: 150,
        render: (disc: any, record: Episode) => {
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
        render: (_: any, record: Episode) => (
          <Space size="small">
            <Button type="link" size="small" onClick={() => handleEditEpisode(record)}>
              编辑
            </Button>
            <Popconfirm title="确认删除?" onConfirm={() => handleDeleteEpisode(record.id)}>
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
        dataSource={record.episodes}
        rowKey="id"
        pagination={false}
        size="small"
      />
    )
  }

  const columns = [
    { title: '番剧名称', dataIndex: 'name', key: 'name' },
    {
      title: '总大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number | null) => formatSize(size),
    },
    {
      title: '剧集数',
      dataIndex: 'episodes',
      key: 'episodes',
      width: 100,
      render: (episodes: Episode[]) => episodes.length,
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      render: (_: any, record: Bangumi) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={() => showEpisodes(record)}
          >
            剧集
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
          <Popconfirm title="确认删除? 删除番剧将同时删除所有剧集" onConfirm={() => handleDelete(record.id)}>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加番剧
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={bangumiList}
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
        title={editingBangumi ? '编辑番剧' : '添加番剧'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="番剧名称"
            name="name"
            rules={[{ required: true, message: '请输入番剧名称' }]}
          >
            <Input placeholder="请输入番剧名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`剧集管理 - ${selectedBangumi?.name}`}
        open={episodeModalVisible}
        onCancel={() => setEpisodeModalVisible(false)}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16, background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
            {editingEpisode ? '编辑剧集' : '添加剧集'}
          </div>
          <Form form={episodeForm} layout="inline" onFinish={handleEpisodeSubmit}>
            <Form.Item name="season" label="季" rules={[{ required: true }]}>
              <Input style={{ width: 80 }} placeholder="S01" />
            </Form.Item>
            <Form.Item name="episode" label="集数" rules={[{ required: true }]}>
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
            <Form.Item name="format" label="格式" rules={[{ required: true }]}>
              <Select style={{ width: 100 }} options={FILE_FORMATS} />
            </Form.Item>
            <Form.Item name="codec" label="编码" rules={[{ required: true }]}>
              <Select style={{ width: 100 }} options={VIDEO_CODECS} />
            </Form.Item>
            {/* Discs are now managed through the disc creation/editing interface */}
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingEpisode ? '更新' : '添加'}
              </Button>
            </Form.Item>
            {editingEpisode && (
              <Form.Item>
                <Button onClick={() => { episodeForm.resetFields(); setEditingEpisode(null) }}>
                  取消
                </Button>
              </Form.Item>
            )}
          </Form>
        </div>
        <Table
          columns={[
            { title: '季', dataIndex: 'season', width: 80 },
            { title: '集数', dataIndex: 'episode', width: 80 },
            { title: '大小', dataIndex: 'size', render: (s: number) => formatSize(s) },
            { title: '格式', dataIndex: 'format', width: 80 },
            { title: '编码', dataIndex: 'codec', width: 100 },
            {
              title: '光盘',
              dataIndex: 'disc',
              width: 150,
              render: (d: any, record: Episode) => {
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
              width: 150,
              render: (_: any, record: Episode) => (
                <Space>
                  <Button type="link" size="small" onClick={() => handleEditEpisode(record)}>
                    编辑
                  </Button>
                  <Popconfirm title="确认删除?" onConfirm={() => handleDeleteEpisode(record.id)}>
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          dataSource={selectedBangumi?.episodes || []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Modal>

      <Modal
        title={`光盘分布 - ${selectedBangumi?.name}`}
        open={distributionModalVisible}
        onCancel={() => setDistributionModalVisible(false)}
        footer={null}
        width={800}
      >
        <Collapse
          items={distributionData.map(d => ({
            key: d.discCode,
            label: (
              <Space>
                <Tag color={d.discCode === '未分配' ? 'default' : 'blue'}>{d.discCode}</Tag>
                <span>{d.episodes.length} 集</span>
              </Space>
            ),
            children: (
              <Table
                columns={[
                  { title: '季', dataIndex: 'season', width: 60 },
                  { title: '集数', dataIndex: 'episode', width: 60 },
                  { title: '大小', dataIndex: 'size', render: (s: number) => formatSize(s) },
                ]}
                dataSource={d.episodes}
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
