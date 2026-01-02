'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Tag, DatePicker, Badge, Tabs, Divider, TreeSelect, Grid, Card, Alert } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined, MinusCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatSize, DISC_TYPES, SIZE_UNITS, FILE_FORMATS, VIDEO_CODECS } from '@/lib/utils'

const { TabPane } = Tabs
const { useBreakpoint } = Grid

type Disc = {
  id: number
  code: string
  type: string
  size: number | null
  movies: any[]
  bangumiEpisodes: any[]
  photoVolumes: any[]
  others: any[]
  history: any[]
  createdAt: string
}

type Movie = { id: number; name: string; size: number | null; format: string; codec: string; discId: number | null }
type Bangumi = { id: number; name: string; episodes?: BangumiEpisode[] }
type BangumiEpisode = { id: number; season: string; episode: number; size: number | null; format: string; codec: string; bangumiId: number; discId: number | null; bangumi: Bangumi }
type Photo = { id: number; name: string; volumes?: PhotoVolume[] }
type PhotoVolume = { id: number; vol: number; size: number | null; photoId: number; discId: number | null; photo: Photo }
type Other = { id: number; name: string; desc: string; size: number | null; discId: number | null }

export default function DiscsPage() {
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [discs, setDiscs] = useState<Disc[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDisc, setEditingDisc] = useState<Disc | null>(null)
  const [historyVisible, setHistoryVisible] = useState(false)
  const [selectedDisc, setSelectedDisc] = useState<Disc | null>(null)
  const [history, setHistory] = useState<any[]>([])

  // Available resources
  const [availableMovies, setAvailableMovies] = useState<Movie[]>([])
  const [availableBangumi, setAvailableBangumi] = useState<Bangumi[]>([])
  const [availableEpisodes, setAvailableEpisodes] = useState<BangumiEpisode[]>([])
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([])
  const [availableVolumes, setAvailableVolumes] = useState<PhotoVolume[]>([])
  const [availableOthers, setAvailableOthers] = useState<Other[]>([])

  // Selected resources for new disc
  const [selectedMovieIds, setSelectedMovieIds] = useState<number[]>([])
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<number[]>([])
  const [selectedVolumeIds, setSelectedVolumeIds] = useState<number[]>([])
  const [selectedOtherIds, setSelectedOtherIds] = useState<number[]>([])

  // New resources to create
  const [newMovies, setNewMovies] = useState<any[]>([])
  const [newBangumi, setNewBangumi] = useState<any[]>([]) // New bangumi with episodes
  const [newEpisodes, setNewEpisodes] = useState<any[]>([]) // Episodes for existing bangumi
  const [newPhotos, setNewPhotos] = useState<any[]>([]) // New photos with volumes
  const [newVolumes, setNewVolumes] = useState<any[]>([]) // Volumes for existing photos
  const [newOthers, setNewOthers] = useState<any[]>([])

  // Notes for selected resources
  const [movieNotes, setMovieNotes] = useState<Record<number, string>>({})
  const [episodeNotes, setEpisodeNotes] = useState<Record<number, string>>({})
  const [volumeNotes, setVolumeNotes] = useState<Record<number, string>>({})
  const [otherNotes, setOtherNotes] = useState<Record<number, string>>({})

  // Duplicate warnings
  const [duplicateWarnings, setDuplicateWarnings] = useState<any[]>([])

  const [form] = Form.useForm()
  const [historyForm] = Form.useForm()

  useEffect(() => {
    fetchDiscs()
  }, [page, pageSize])

  // Validate selected resources for duplicates
  useEffect(() => {
    const validateResources = async () => {
      if (selectedMovieIds.length === 0 &&
          selectedEpisodeIds.length === 0 &&
          selectedVolumeIds.length === 0 &&
          selectedOtherIds.length === 0) {
        setDuplicateWarnings([])
        return
      }

      try {
        const res = await fetch('/api/discs/validate-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieIds: selectedMovieIds,
            episodeIds: selectedEpisodeIds,
            volumeIds: selectedVolumeIds,
            otherIds: selectedOtherIds,
          }),
        })
        const data = await res.json()
        setDuplicateWarnings(data.duplicates || [])
      } catch (error) {
        console.error('Validation failed', error)
      }
    }

    validateResources()
  }, [selectedMovieIds, selectedEpisodeIds, selectedVolumeIds, selectedOtherIds])

  const fetchDiscs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/discs?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      setDiscs(data.data)
      setTotal(data.total)
    } catch (error) {
      message.error('加载光盘数据失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableResources = async () => {
    try {
      const [moviesRes, bangumiRes, episodesRes, photosRes, volumesRes, othersRes] = await Promise.all([
        fetch('/api/movies?pageSize=1000'),
        fetch('/api/bangumi?pageSize=1000'),
        fetch('/api/bangumi?pageSize=1000'),
        fetch('/api/photo?pageSize=1000'),
        fetch('/api/photo?pageSize=1000'),
        fetch('/api/other?pageSize=1000'),
      ])

      const moviesData = await moviesRes.json()
      const bangumiData = await bangumiRes.json()
      const episodesData = await episodesRes.json()
      const photosData = await photosRes.json()
      const volumesData = await volumesRes.json()
      const othersData = await othersRes.json()

      // Now we show all resources (resources can be on multiple discs)
      setAvailableMovies(moviesData.data)
      setAvailableBangumi(bangumiData.data)

      // Get all episodes from bangumi
      const allEpisodes: BangumiEpisode[] = []
      bangumiData.data.forEach((b: Bangumi) => {
        b.episodes?.forEach((e: BangumiEpisode) => allEpisodes.push(e))
      })
      setAvailableEpisodes(allEpisodes)

      setAvailablePhotos(photosData.data)

      // Get all volumes from photos
      const allVolumes: PhotoVolume[] = []
      photosData.data.forEach((p: Photo) => {
        p.volumes?.forEach((v: PhotoVolume) => allVolumes.push(v))
      })
      setAvailableVolumes(allVolumes)

      setAvailableOthers(othersData.data)
    } catch (error) {
      console.error('加载资源数据失败', error)
    }
  }

  const handleAdd = async () => {
    setEditingDisc(null)
    form.resetFields()
    setSelectedMovieIds([])
    setSelectedEpisodeIds([])
    setSelectedVolumeIds([])
    setSelectedOtherIds([])
    setNewMovies([])
    setNewBangumi([])
    setNewEpisodes([])
    setNewPhotos([])
    setNewVolumes([])
    setNewOthers([])
    setMovieNotes({})
    setEpisodeNotes({})
    setVolumeNotes({})
    setOtherNotes({})
    setDuplicateWarnings([])
    await fetchAvailableResources()
    setModalVisible(true)
  }

  const handleEdit = (disc: Disc) => {
    setEditingDisc(disc)
    form.setFieldsValue({
      type: disc.type,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/discs/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      fetchDiscs()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // Check if there are duplicates and show confirmation
      if (duplicateWarnings.length > 0) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '确认创建副本？',
            content: `以下资源已在其他光盘上，将创建副本：\n${duplicateWarnings.map(d => `- ${d.resourceName} (光盘: ${d.discCode})`).join('\n')}`,
            okText: '确认创建',
            cancelText: '取消',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (!confirmed) return
      }

      // Build payload with selected and new resources
      const payload: any = {
        type: values.type,
      }

      if (values.sizeValue !== undefined && values.sizeValue !== null && values.sizeUnit) {
        payload.size = `${values.sizeValue}${values.sizeUnit}`
      }

      // Add selected movie IDs to be linked
      if (selectedMovieIds.length > 0) {
        payload.selectedMovieIds = selectedMovieIds
        payload.movieNotes = movieNotes
      }

      // Add new movies to create
      if (newMovies.length > 0) {
        payload.movies = newMovies
      }

      // Add selected episode IDs to be linked
      if (selectedEpisodeIds.length > 0) {
        payload.selectedEpisodeIds = selectedEpisodeIds
        payload.episodeNotes = episodeNotes
      }

      // Add new episodes to create
      if (newEpisodes.length > 0) {
        payload.bangumiEpisodes = newEpisodes
      }

      // Add new bangumi with episodes
      if (newBangumi.length > 0) {
        payload.newBangumi = newBangumi
      }

      // Add selected volume IDs to be linked
      if (selectedVolumeIds.length > 0) {
        payload.selectedVolumeIds = selectedVolumeIds
        payload.volumeNotes = volumeNotes
      }

      // Add new volumes to create
      if (newVolumes.length > 0) {
        payload.photoVolumes = newVolumes
      }

      // Add new photos with volumes
      if (newPhotos.length > 0) {
        payload.newPhotos = newPhotos
      }

      // Add selected other IDs to be linked
      if (selectedOtherIds.length > 0) {
        payload.selectedOtherIds = selectedOtherIds
        payload.otherNotes = otherNotes
      }

      // Add new others to create
      if (newOthers.length > 0) {
        payload.others = newOthers
      }

      const res = await fetch('/api/discs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        message.success('创建成功')
        setModalVisible(false)
        fetchDiscs()
      } else {
        const error = await res.json()
        message.error(error.error || '创建失败')
      }
    } catch (error) {
      // User cancelled or other error
      if (error !== 'cancelled') {
        message.error('操作失败')
      }
    }
  }

  const addNewMovie = () => {
    setNewMovies([...newMovies, { name: '', sizeValue: '', sizeUnit: 'MiB', format: 'MKV', codec: 'H.264' }])
  }

  const updateNewMovie = (index: number, field: string, value: any) => {
    const updated = [...newMovies]
    updated[index] = { ...updated[index], [field]: value }
    setNewMovies(updated)
  }

  const removeNewMovie = (index: number) => {
    setNewMovies(newMovies.filter((_, i) => i !== index))
  }

  const addNewEpisode = () => {
    setNewEpisodes([...newEpisodes, { bangumiId: null, season: 'S01', episode: 1, sizeValue: '', sizeUnit: 'MiB', format: 'MKV', codec: 'H.264' }])
  }

  const updateNewEpisode = (index: number, field: string, value: any) => {
    const updated = [...newEpisodes]
    updated[index] = { ...updated[index], [field]: value }
    setNewEpisodes(updated)
  }

  const removeNewEpisode = (index: number) => {
    setNewEpisodes(newEpisodes.filter((_, i) => i !== index))
  }

  const addNewVolume = () => {
    setNewVolumes([...newVolumes, { photoId: null, vol: 1, sizeValue: '', sizeUnit: 'MiB' }])
  }

  const updateNewVolume = (index: number, field: string, value: any) => {
    const updated = [...newVolumes]
    updated[index] = { ...updated[index], [field]: value }
    setNewVolumes(updated)
  }

  const removeNewVolume = (index: number) => {
    setNewVolumes(newVolumes.filter((_, i) => i !== index))
  }

  const addNewOther = () => {
    setNewOthers([...newOthers, { name: '', desc: '', sizeValue: '', sizeUnit: 'MiB' }])
  }

  const updateNewOther = (index: number, field: string, value: any) => {
    const updated = [...newOthers]
    updated[index] = { ...updated[index], [field]: value }
    setNewOthers(updated)
  }

  const removeNewOther = (index: number) => {
    setNewOthers(newOthers.filter((_, i) => i !== index))
  }

  // Handler functions for new bangumi (with episodes)
  const addNewBangumi = () => {
    setNewBangumi([...newBangumi, { name: '', episodes: [{ season: 'S01', episode: 1, sizeValue: '', sizeUnit: 'MiB', format: 'MKV', codec: 'H.264' }] }])
  }

  const updateNewBangumi = (index: number, field: string, value: any) => {
    const updated = [...newBangumi]
    updated[index] = { ...updated[index], [field]: value }
    setNewBangumi(updated)
  }

  const removeNewBangumi = (index: number) => {
    setNewBangumi(newBangumi.filter((_, i) => i !== index))
  }

  const addEpisodeToBangumi = (bangumiIndex: number) => {
    const updated = [...newBangumi]
    updated[bangumiIndex] = {
      ...updated[bangumiIndex],
      episodes: [...updated[bangumiIndex].episodes, { season: 'S01', episode: 1, sizeValue: '', sizeUnit: 'MiB', format: 'MKV', codec: 'H.264' }]
    }
    setNewBangumi(updated)
  }

  const updateBangumiEpisode = (bangumiIndex: number, episodeIndex: number, field: string, value: any) => {
    const updated = [...newBangumi]
    updated[bangumiIndex] = {
      ...updated[bangumiIndex],
      episodes: updated[bangumiIndex].episodes.map((ep: any, i: number) =>
        i === episodeIndex ? { ...ep, [field]: value } : ep
      )
    }
    setNewBangumi(updated)
  }

  const removeBangumiEpisode = (bangumiIndex: number, episodeIndex: number) => {
    const updated = [...newBangumi]
    updated[bangumiIndex] = {
      ...updated[bangumiIndex],
      episodes: updated[bangumiIndex].episodes.filter((_: any, i: number) => i !== episodeIndex)
    }
    setNewBangumi(updated)
  }

  // Handler functions for new photos (with volumes)
  const addNewPhoto = () => {
    setNewPhotos([...newPhotos, { name: '', volumes: [{ vol: 1, sizeValue: '', sizeUnit: 'MiB' }] }])
  }

  const updateNewPhoto = (index: number, field: string, value: any) => {
    const updated = [...newPhotos]
    updated[index] = { ...updated[index], [field]: value }
    setNewPhotos(updated)
  }

  const removeNewPhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index))
  }

  const addVolumeToPhoto = (photoIndex: number) => {
    const currentVol = newPhotos[photoIndex]?.volumes?.length || 0
    setNewPhotos(newPhotos.map((p, i) =>
      i === photoIndex
        ? { ...p, volumes: [...p.volumes, { vol: currentVol + 1, sizeValue: '', sizeUnit: 'MiB' }] }
        : p
    ))
  }

  const updatePhotoVolume = (photoIndex: number, volumeIndex: number, field: string, value: any) => {
    const updated = newPhotos.map((p, i) => {
      if (i === photoIndex) {
        return {
          ...p,
          volumes: p.volumes.map((v: any, j: number) =>
            j === volumeIndex ? { ...v, [field]: value } : v
          )
        }
      }
      return p
    })
    setNewPhotos(updated)
  }

  const removePhotoVolume = (photoIndex: number, volumeIndex: number) => {
    const updated = newPhotos.map((p, i) => {
      if (i === photoIndex) {
        return {
          ...p,
          volumes: p.volumes.filter((_: any, j: number) => j !== volumeIndex)
        }
      }
      return p
    })
    setNewPhotos(updated)
  }

  const showHistory = async (disc: Disc) => {
    setSelectedDisc(disc)
    try {
      const res = await fetch(`/api/discs/${disc.id}/history`)
      const data = await res.json()
      setHistory(data)
      setHistoryVisible(true)
    } catch (error) {
      message.error('加载巡检记录失败')
    }
  }

  const addHistory = async () => {
    try {
      const values = await historyForm.validateFields()
      await fetch(`/api/discs/${selectedDisc!.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          date: values.date.format('YYYY-MM-DD'),
        }),
      })
      message.success('添加巡检记录成功')
      historyForm.resetFields()
      showHistory(selectedDisc!)
    } catch (error) {
      message.error('添加巡检记录失败')
    }
  }

  const columns = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 100, responsive: ['md' as const] },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      responsive: ['md' as const],
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number | null) => formatSize(size),
      responsive: ['sm' as const],
    },
    {
      title: '内容',
      key: 'content',
      render: (_: any, record: Disc) => {
        const items = []
        if (record.movies.length > 0) items.push(<Tag key="movie">影片 {record.movies.length}</Tag>)
        if (record.bangumiEpisodes.length > 0) items.push(<Tag key="bangumi">番剧 {record.bangumiEpisodes.length}</Tag>)
        if (record.photoVolumes.length > 0) items.push(<Tag key="photo">写真 {record.photoVolumes.length}</Tag>)
        if (record.others.length > 0) items.push(<Tag key="other">其他 {record.others.length}</Tag>)
        if (items.length === 0) return <Tag>空</Tag>
        return <Space size={4} wrap>{items}</Space>
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      responsive: ['md' as const],
      render: (_: any, record: Disc) => {
        if (record.history.length === 0) return <Tag>未巡检</Tag>
        const latest = record.history[0]
        return (
          <Badge
            status={latest.status ? 'success' : 'error'}
            text={latest.status ? '良好' : '异常'}
          />
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Disc) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => showHistory(record)}>
            巡检
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Mobile card render
  const renderMobileCard = (record: Disc) => (
    <Card
      key={record.id}
      size="small"
      style={{ marginBottom: 8 }}
      title={
        <Space>
          <span style={{ fontWeight: 'bold' }}>{record.code}</span>
          <Tag>{record.type}</Tag>
        </Space>
      }
      extra={
        <Space size="small">
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => showHistory(record)} />
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
          <span style={{ color: '#888' }}>内容: </span>
          {(() => {
            const items = []
            if (record.movies.length > 0) items.push(<Tag key="movie">影片 {record.movies.length}</Tag>)
            if (record.bangumiEpisodes.length > 0) items.push(<Tag key="bangumi">番剧 {record.bangumiEpisodes.length}</Tag>)
            if (record.photoVolumes.length > 0) items.push(<Tag key="photo">写真 {record.photoVolumes.length}</Tag>)
            if (record.others.length > 0) items.push(<Tag key="other">其他 {record.others.length}</Tag>)
            if (items.length === 0) return <Tag>空</Tag>
            return <Space size={4} wrap>{items}</Space>
          })()}
        </div>
        <div>
          <span style={{ color: '#888' }}>状态: </span>
          {record.history.length === 0 ? (
            <Tag>未巡检</Tag>
          ) : (
            <Badge
              status={record.history[0].status ? 'success' : 'error'}
              text={record.history[0].status ? '良好' : '异常'}
            />
          )}
        </div>
      </div>
    </Card>
  )

  return (
    <div style={{ padding: isMobile ? 8 : 0 }}>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} block={isMobile}>
          添加光盘
        </Button>
      </div>

      {isMobile ? (
        <div>
          {discs.map(renderMobileCard)}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Space wrap>
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span>
                第 {page} 页，共 {Math.ceil(total / pageSize)} 页
              </span>
              <Button
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </Space>
          </div>
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={discs}
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
          scroll={{ x: 800 }}
        />
      )}

      <Modal
        title={editingDisc ? '编辑光盘' : '添加光盘'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '95%' : 900}
        style={{ top: isMobile ? 20 : 100 }}
        footer={editingDisc ? null : (
          <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button block={isMobile} onClick={() => setModalVisible(false)}>取消</Button>
            <Button block={isMobile} type="primary" onClick={handleSubmit}>创建</Button>
          </Space>
        )}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="光盘类型"
            name="type"
            rules={[{ required: true, message: '请选择光盘类型' }]}
          >
            <Select options={DISC_TYPES} placeholder="请选择光盘类型" disabled={!!editingDisc} />
          </Form.Item>
          <Form.Item label="大小" extra="可选，如不填写将根据内容自动计算">
            <Input.Group compact>
              <Form.Item name="sizeValue" noStyle>
                <Input
                  type="number"
                  style={{ width: '70%' }}
                  placeholder="输入数值"
                  min={0}
                  step={0.01}
                  disabled={!!editingDisc}
                />
              </Form.Item>
              <Form.Item name="sizeUnit" noStyle initialValue="GiB">
                <Select style={{ width: '30%' }} disabled={!!editingDisc}>
                  {SIZE_UNITS.map(unit => (
                    <Select.Option key={unit.value} value={unit.value}>
                      {unit.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Input.Group>
          </Form.Item>
        </Form>

        {!editingDisc && (
          <>
            {duplicateWarnings.length > 0 && (
              <Alert
                type="warning"
                message="以下资源已刻录到其他光盘"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {duplicateWarnings.map((dup, idx) => (
                      <li key={idx}>
                        {dup.resourceName} 已在光盘 <Tag color="blue">{dup.discCode}</Tag> 上
                        {dup.burnedAt && ` (${dayjs(dup.burnedAt).format('YYYY-MM-DD')})`}
                      </li>
                    ))}
                  </ul>
                }
                style={{ marginBottom: 16 }}
              />
            )}
            <Tabs defaultActiveKey="movies">
            <TabPane tab={`影片 (${selectedMovieIds.length + newMovies.length})`} key="movies">
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>选择现有影片</div>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="选择要添加到光盘的影片"
                  value={selectedMovieIds}
                  onChange={setSelectedMovieIds}
                  options={availableMovies.map(m => ({ label: `${m.name} (${formatSize(m.size)})`, value: m.id }))}
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </div>
              <Divider />
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <span style={{ fontWeight: 'bold' }}>创建新影片</span>
                  <Button size="small" icon={<PlusOutlined />} onClick={addNewMovie}>添加</Button>
                </Space>
              </div>
              {newMovies.map((movie, index) => (
                <div key={index} style={{ marginBottom: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                  <Space style={{ marginBottom: 8 }}>
                    <Input
                      placeholder="影片名称"
                      value={movie.name}
                      onChange={(e) => updateNewMovie(index, 'name', e.target.value)}
                      style={{ width: 200 }}
                    />
                    <Input.Group compact>
                      <Input
                        type="number"
                        placeholder="大小"
                        value={movie.sizeValue}
                        onChange={(e) => updateNewMovie(index, 'sizeValue', e.target.value)}
                        style={{ width: 80 }}
                        min={0}
                        step={0.01}
                      />
                      <Select
                        value={movie.sizeUnit}
                        onChange={(v) => updateNewMovie(index, 'sizeUnit', v)}
                        style={{ width: 70 }}
                      >
                        {SIZE_UNITS.map(unit => (
                          <Select.Option key={unit.value} value={unit.value}>{unit.label}</Select.Option>
                        ))}
                      </Select>
                    </Input.Group>
                    <Select
                      value={movie.format}
                      onChange={(v) => updateNewMovie(index, 'format', v)}
                      style={{ width: 80 }}
                      options={FILE_FORMATS}
                    />
                    <Select
                      value={movie.codec}
                      onChange={(v) => updateNewMovie(index, 'codec', v)}
                      style={{ width: 100 }}
                      options={VIDEO_CODECS}
                    />
                    <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeNewMovie(index)} />
                  </Space>
                </div>
              ))}
            </TabPane>

            <TabPane tab={`番剧剧集 (${selectedEpisodeIds.length + newEpisodes.length})`} key="episodes">
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>选择现有剧集</div>
                <TreeSelect
                  multiple
                  treeCheckable
                  style={{ width: '100%' }}
                  placeholder="选择要添加到光盘的剧集"
                  value={selectedEpisodeIds}
                  onChange={(values: any) => setSelectedEpisodeIds(values)}
                  treeData={(() => {
                    // Group episodes by bangumi
                    const bangumiMap = new Map<number, { id: number; name: string; episodes: BangumiEpisode[] }>()
                    availableBangumi.forEach(b => {
                      bangumiMap.set(b.id, { id: b.id, name: b.name, episodes: [] })
                    })
                    availableEpisodes.forEach(e => {
                      if (e.bangumiId && bangumiMap.has(e.bangumiId)) {
                        bangumiMap.get(e.bangumiId)!.episodes.push(e)
                      }
                    })
                    // Build tree data
                    return Array.from(bangumiMap.values())
                      .filter(b => b.episodes.length > 0)
                      .map(b => ({
                        title: `${b.name} (${b.episodes.length} 集)`,
                        value: `bangumi-${b.id}`,
                        key: `bangumi-${b.id}`,
                        selectable: false,
                        children: b.episodes.map(e => ({
                          title: `${e.season}E${e.episode} (${formatSize(e.size)})`,
                          value: e.id,
                          key: e.id,
                        }))
                      }))
                  })()}
                  treeDefaultExpandAll
                  showCheckedStrategy={TreeSelect.SHOW_CHILD}
                  maxTagCount="responsive"
                />
              </div>
              <Divider />
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <span style={{ fontWeight: 'bold' }}>创建新剧集</span>
                  <Button size="small" icon={<PlusOutlined />} onClick={addNewEpisode}>添加</Button>
                </Space>
              </div>
              {newEpisodes.map((ep, index) => (
                <div key={index} style={{ marginBottom: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                  <Space style={{ marginBottom: 8 }}>
                    <Select
                      placeholder="番剧"
                      value={ep.bangumiId}
                      onChange={(v) => updateNewEpisode(index, 'bangumiId', v)}
                      style={{ width: 150 }}
                      options={availableBangumi.map(b => ({ label: b.name, value: b.id }))}
                      showSearch
                      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                    <Input
                      placeholder="季"
                      value={ep.season}
                      onChange={(e) => updateNewEpisode(index, 'season', e.target.value)}
                      style={{ width: 60 }}
                    />
                    <Input
                      type="number"
                      placeholder="集"
                      value={ep.episode}
                      onChange={(e) => updateNewEpisode(index, 'episode', parseInt(e.target.value) || 1)}
                      style={{ width: 60 }}
                    />
                    <Input.Group compact>
                      <Input
                        type="number"
                        placeholder="大小"
                        value={ep.sizeValue}
                        onChange={(e) => updateNewEpisode(index, 'sizeValue', e.target.value)}
                        style={{ width: 70 }}
                        min={0}
                        step={0.01}
                      />
                      <Select
                        value={ep.sizeUnit}
                        onChange={(v) => updateNewEpisode(index, 'sizeUnit', v)}
                        style={{ width: 65 }}
                      >
                        {SIZE_UNITS.map(unit => (
                          <Select.Option key={unit.value} value={unit.value}>{unit.label}</Select.Option>
                        ))}
                      </Select>
                    </Input.Group>
                    <Select
                      value={ep.format}
                      onChange={(v) => updateNewEpisode(index, 'format', v)}
                      style={{ width: 70 }}
                      options={FILE_FORMATS}
                    />
                    <Select
                      value={ep.codec}
                      onChange={(v) => updateNewEpisode(index, 'codec', v)}
                      style={{ width: 80 }}
                      options={VIDEO_CODECS}
                    />
                    <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeNewEpisode(index)} />
                  </Space>
                </div>
              ))}
              <Divider />
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <span style={{ fontWeight: 'bold' }}>创建新番剧（含剧集）</span>
                  <Button size="small" icon={<PlusOutlined />} onClick={addNewBangumi}>添加番剧</Button>
                </Space>
              </div>
              {newBangumi.map((bangumi, bIndex) => (
                <div key={bIndex} style={{ marginBottom: 16, padding: 12, border: '2px solid #1890ff', borderRadius: 4 }}>
                  <Space style={{ marginBottom: 8 }}>
                    <Input
                      placeholder="番剧名称"
                      value={bangumi.name}
                      onChange={(e) => updateNewBangumi(bIndex, 'name', e.target.value)}
                      style={{ width: 200 }}
                    />
                    <Button size="small" icon={<PlusOutlined />} onClick={() => addEpisodeToBangumi(bIndex)}>添加剧集</Button>
                    <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeNewBangumi(bIndex)} />
                  </Space>
                  {bangumi.episodes?.map((ep: any, eIndex: number) => (
                    <div key={eIndex} style={{ marginLeft: 16, marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                      <Space>
                        <Input
                          placeholder="季"
                          value={ep.season}
                          onChange={(e) => updateBangumiEpisode(bIndex, eIndex, 'season', e.target.value)}
                          style={{ width: 60 }}
                        />
                        <Input
                          type="number"
                          placeholder="集"
                          value={ep.episode}
                          onChange={(e) => updateBangumiEpisode(bIndex, eIndex, 'episode', parseInt(e.target.value) || 1)}
                          style={{ width: 60 }}
                        />
                        <Input.Group compact>
                          <Input
                            type="number"
                            placeholder="大小"
                            value={ep.sizeValue}
                            onChange={(e) => updateBangumiEpisode(bIndex, eIndex, 'sizeValue', e.target.value)}
                            style={{ width: 70 }}
                            min={0}
                            step={0.01}
                          />
                          <Select
                            value={ep.sizeUnit}
                            onChange={(v) => updateBangumiEpisode(bIndex, eIndex, 'sizeUnit', v)}
                            style={{ width: 65 }}
                          >
                            {SIZE_UNITS.map(unit => (
                              <Select.Option key={unit.value} value={unit.value}>{unit.label}</Select.Option>
                            ))}
                          </Select>
                        </Input.Group>
                        <Select
                          value={ep.format}
                          onChange={(v) => updateBangumiEpisode(bIndex, eIndex, 'format', v)}
                          style={{ width: 70 }}
                          options={FILE_FORMATS}
                        />
                        <Select
                          value={ep.codec}
                          onChange={(v) => updateBangumiEpisode(bIndex, eIndex, 'codec', v)}
                          style={{ width: 80 }}
                          options={VIDEO_CODECS}
                        />
                        <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeBangumiEpisode(bIndex, eIndex)} />
                      </Space>
                    </div>
                  ))}
                </div>
              ))}
            </TabPane>

            <TabPane tab={`写真期数 (${selectedVolumeIds.length + newVolumes.length})`} key="volumes">
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>选择现有期数</div>
                <TreeSelect
                  multiple
                  treeCheckable
                  style={{ width: '100%' }}
                  placeholder="选择要添加到光盘的期数"
                  value={selectedVolumeIds}
                  onChange={(values: any) => setSelectedVolumeIds(values)}
                  treeData={(() => {
                    // Group volumes by photo
                    const photoMap = new Map<number, { id: number; name: string; volumes: PhotoVolume[] }>()
                    availablePhotos.forEach(p => {
                      photoMap.set(p.id, { id: p.id, name: p.name, volumes: [] })
                    })
                    availableVolumes.forEach(v => {
                      if (v.photoId && photoMap.has(v.photoId)) {
                        photoMap.get(v.photoId)!.volumes.push(v)
                      }
                    })
                    // Build tree data
                    return Array.from(photoMap.values())
                      .filter(p => p.volumes.length > 0)
                      .map(p => ({
                        title: `${p.name} (${p.volumes.length} 期)`,
                        value: `photo-${p.id}`,
                        key: `photo-${p.id}`,
                        selectable: false,
                        children: p.volumes.map(v => ({
                          title: `Vol.${v.vol} (${formatSize(v.size)})`,
                          value: v.id,
                          key: v.id,
                        }))
                      }))
                  })()}
                  treeDefaultExpandAll
                  showCheckedStrategy={TreeSelect.SHOW_CHILD}
                  maxTagCount="responsive"
                />
              </div>
              <Divider />
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <span style={{ fontWeight: 'bold' }}>创建新期数</span>
                  <Button size="small" icon={<PlusOutlined />} onClick={addNewVolume}>添加</Button>
                </Space>
              </div>
              {newVolumes.map((vol, index) => (
                <div key={index} style={{ marginBottom: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                  <Space style={{ marginBottom: 8 }}>
                    <Select
                      placeholder="写真"
                      value={vol.photoId}
                      onChange={(v) => updateNewVolume(index, 'photoId', v)}
                      style={{ width: 150 }}
                      options={availablePhotos.map(p => ({ label: p.name, value: p.id }))}
                      showSearch
                      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                    <Input
                      type="number"
                      placeholder="期数"
                      value={vol.vol}
                      onChange={(e) => updateNewVolume(index, 'vol', parseInt(e.target.value) || 1)}
                      style={{ width: 70 }}
                    />
                    <Input.Group compact>
                      <Input
                        type="number"
                        placeholder="大小"
                        value={vol.sizeValue}
                        onChange={(e) => updateNewVolume(index, 'sizeValue', e.target.value)}
                        style={{ width: 80 }}
                        min={0}
                        step={0.01}
                      />
                      <Select
                        value={vol.sizeUnit}
                        onChange={(v) => updateNewVolume(index, 'sizeUnit', v)}
                        style={{ width: 70 }}
                      >
                        {SIZE_UNITS.map(unit => (
                          <Select.Option key={unit.value} value={unit.value}>{unit.label}</Select.Option>
                        ))}
                      </Select>
                    </Input.Group>
                    <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeNewVolume(index)} />
                  </Space>
                </div>
              ))}
              <Divider />
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <span style={{ fontWeight: 'bold' }}>创建新写真（含期数）</span>
                  <Button size="small" icon={<PlusOutlined />} onClick={addNewPhoto}>添加写真</Button>
                </Space>
              </div>
              {newPhotos.map((photo, pIndex) => (
                <div key={pIndex} style={{ marginBottom: 16, padding: 12, border: '2px solid #52c41a', borderRadius: 4 }}>
                  <Space style={{ marginBottom: 8 }}>
                    <Input
                      placeholder="写真名称"
                      value={photo.name}
                      onChange={(e) => updateNewPhoto(pIndex, 'name', e.target.value)}
                      style={{ width: 200 }}
                    />
                    <Button size="small" icon={<PlusOutlined />} onClick={() => addVolumeToPhoto(pIndex)}>添加期数</Button>
                    <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeNewPhoto(pIndex)} />
                  </Space>
                  {photo.volumes?.map((vol: any, vIndex: number) => (
                    <div key={vIndex} style={{ marginLeft: 16, marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                      <Space>
                        <Input
                          type="number"
                          placeholder="期数"
                          value={vol.vol}
                          onChange={(e) => updatePhotoVolume(pIndex, vIndex, 'vol', parseInt(e.target.value) || 1)}
                          style={{ width: 70 }}
                        />
                        <Input.Group compact>
                          <Input
                            type="number"
                            placeholder="大小"
                            value={vol.sizeValue}
                            onChange={(e) => updatePhotoVolume(pIndex, vIndex, 'sizeValue', e.target.value)}
                            style={{ width: 80 }}
                            min={0}
                            step={0.01}
                          />
                          <Select
                            value={vol.sizeUnit}
                            onChange={(v) => updatePhotoVolume(pIndex, vIndex, 'sizeUnit', v)}
                            style={{ width: 70 }}
                          >
                            {SIZE_UNITS.map(unit => (
                              <Select.Option key={unit.value} value={unit.value}>{unit.label}</Select.Option>
                            ))}
                          </Select>
                        </Input.Group>
                        <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removePhotoVolume(pIndex, vIndex)} />
                      </Space>
                    </div>
                  ))}
                </div>
              ))}
            </TabPane>

            <TabPane tab={`其他资源 (${selectedOtherIds.length + newOthers.length})`} key="others">
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>选择现有资源</div>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="选择要添加到光盘的资源"
                  value={selectedOtherIds}
                  onChange={setSelectedOtherIds}
                  options={availableOthers.map(o => ({ label: `${o.name} - ${o.desc} (${formatSize(o.size)})`, value: o.id }))}
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </div>
              <Divider />
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <span style={{ fontWeight: 'bold' }}>创建新资源</span>
                  <Button size="small" icon={<PlusOutlined />} onClick={addNewOther}>添加</Button>
                </Space>
              </div>
              {newOthers.map((other, index) => (
                <div key={index} style={{ marginBottom: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                  <Space style={{ marginBottom: 8 }}>
                    <Input
                      placeholder="名称"
                      value={other.name}
                      onChange={(e) => updateNewOther(index, 'name', e.target.value)}
                      style={{ width: 150 }}
                    />
                    <Input
                      placeholder="描述"
                      value={other.desc}
                      onChange={(e) => updateNewOther(index, 'desc', e.target.value)}
                      style={{ width: 150 }}
                    />
                    <Input.Group compact>
                      <Input
                        type="number"
                        placeholder="大小"
                        value={other.sizeValue}
                        onChange={(e) => updateNewOther(index, 'sizeValue', e.target.value)}
                        style={{ width: 80 }}
                        min={0}
                        step={0.01}
                      />
                      <Select
                        value={other.sizeUnit}
                        onChange={(v) => updateNewOther(index, 'sizeUnit', v)}
                        style={{ width: 70 }}
                      >
                        {SIZE_UNITS.map(unit => (
                          <Select.Option key={unit.value} value={unit.value}>{unit.label}</Select.Option>
                        ))}
                      </Select>
                    </Input.Group>
                    <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeNewOther(index)} />
                  </Space>
                </div>
              ))}
            </TabPane>
          </Tabs>
          </>
        )}
      </Modal>

      <Modal
        title={`巡检记录 - ${selectedDisc?.code}`}
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={null}
        width={isMobile ? '95%' : 700}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Form form={historyForm} layout={isMobile ? 'vertical' : 'inline'} onFinish={addHistory}>
            <Form.Item name="date" label="日期" rules={[{ required: true }]} initialValue={dayjs()}>
              <DatePicker style={{ width: isMobile ? '100%' : undefined }} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select style={{ width: isMobile ? '100%' : 100 }}>
                <Select.Option value={true}>良好</Select.Option>
                <Select.Option value={false}>异常</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="desc" label="备注">
              <Input style={{ width: isMobile ? '100%' : 200 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block={isMobile}>
                添加
              </Button>
            </Form.Item>
          </Form>
        </div>
        <Table
          columns={[
            { title: '日期', dataIndex: 'date', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
            {
              title: '状态',
              dataIndex: 'status',
              render: (status: boolean) => (
                <Tag color={status ? 'green' : 'red'}>{status ? '良好' : '异常'}</Tag>
              ),
            },
            { title: '备注', dataIndex: 'desc', ellipsis: true },
          ]}
          dataSource={history}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: isMobile ? 400 : undefined }}
        />
      </Modal>
    </div>
  )
}
