'use client'

import { useState, useEffect } from 'react'
import { ConfigProvider, Layout, Menu, theme, Button, message } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import {
  AppstoreOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  FileOutlined,
  HistoryOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import DiscsPage from './discs/page'
import MoviesPage from './movies/page'
import BangumiPage from './bangumi/page'
import PhotoPage from './photo/page'
import OtherPage from './other/page'

const { Header, Content, Sider } = Layout

type MenuKey = 'discs' | 'movies' | 'bangumi' | 'photo' | 'other'

export default function Home() {
  const [selectedKey, setSelectedKey] = useState<MenuKey>('discs')
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const router = useRouter()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/login')
        return
      }
      const data = await res.json()
      setUsername(data.user.username)
    } catch (error) {
      message.error('认证失败')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      message.success('已退出登录')
      router.push('/login')
    } catch (error) {
      message.error('退出失败')
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>加载中...</div>
  }

  const menuItems = [
    { key: 'discs', icon: <DatabaseOutlined />, label: '光盘管理' },
    { key: 'movies', icon: <PlayCircleOutlined />, label: '影片管理' },
    { key: 'bangumi', icon: <AppstoreOutlined />, label: '番剧管理' },
    { key: 'photo', icon: <PictureOutlined />, label: '写真管理' },
    { key: 'other', icon: <FileOutlined />, label: '其他资源' },
  ]

  const renderContent = () => {
    switch (selectedKey) {
      case 'discs':
        return <DiscsPage />
      case 'movies':
        return <MoviesPage />
      case 'bangumi':
        return <BangumiPage />
      case 'photo':
        return <PhotoPage />
      case 'other':
        return <OtherPage />
      default:
        return <DiscsPage />
    }
  }

  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          breakpoint="lg"
          collapsedWidth="0"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div style={{ height: 32, margin: 16, fontSize: 20, fontWeight: 'bold', color: '#fff' }}>
            光盘管理系统
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => setSelectedKey(key as MenuKey)}
          />
        </Sider>
        <Layout style={{ marginLeft: 200 }}>
          <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, lineHeight: '64px' }}>
              {menuItems.find(item => item.key === selectedKey)?.label}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span>欢迎, {username}</span>
              <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                退出
              </Button>
            </div>
          </Header>
          <Content style={{ margin: '24px 16px 0' }}>
            <div
              style={{
                padding: 24,
                minHeight: 360,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
              }}
            >
              {renderContent()}
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
