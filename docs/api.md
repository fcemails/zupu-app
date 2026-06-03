# Zupu 家谱系统 API 文档

> 基本访问前缀：`http://localhost:3000/api`
>
> 生产环境请替换为：`https://<your-domain>/api`

---

## 目录

- [鉴权说明](#鉴权说明)
- [1. 族谱 Family](#1-族谱-family)
- [2. 成员 Members](#2-成员-members)
- [3. 配偶 Spouse](#3-配偶-spouse)
- [4. 事件 Events](#4-事件-events)
- [5. 审计 Audit](#5-审计-audit)
- [6. 邀请 Invite](#6-邀请-invite)
- [7. 权限 Access](#7-权限-access)
- [8. 导出 Export](#8-导出-export)
- [9. 迁移 Migration](#9-迁移-migration)
- [10. 上传 Upload](#10-上传-upload)
- [11. 搜索 Search](#11-搜索-search)
- [调用示例](#调用示例)

---

## 鉴权说明

- 所有 API 都依赖当前用户会话。
- 需要登录后才能访问。
- 某些接口还依赖角色权限：`owner` / `admin` / `editor` / `viewer`。

---

## 1. 族谱 Family

### `GET /api/families`
- 描述：获取当前用户可访问的族谱列表
- 查询参数：
  - `page`（可选，默认 `1`）
  - `limit`（可选，默认 `20`，最大 `50`）
- 返回：分页族谱列表

### `POST /api/families`
- 描述：新建族谱
- 请求体（JSON）：
  - `surname` (string, 必填)
  - `tang` (string, 必填)
  - `region` (string, 可选)
  - `era` (string, 可选)
  - `motto` (string, 可选)
  - `zibei` (string, 可选)
  - `access` (`public`|`semi`|`private`, 可选，默认 `semi`)
- 返回：创建成功的族谱对象

### `GET /api/families/{id}`
- 描述：获取族谱详情
- 返回：族谱信息和成员/事件统计

### `PUT /api/families/{id}`
- 描述：更新族谱
- 请求体（JSON）：与 `POST /api/families` 相同字段，均可选
- 返回：更新后的族谱对象

### `DELETE /api/families/{id}`
- 描述：删除族谱
- 返回：`{ ok: true }`

---

## 2. 成员 Members

### `GET /api/families/{id}/members`
- 描述：获取族谱成员列表
- 查询参数：
  - `page`（默认 `1`）
  - `limit`（默认 `50`，最大 `100`）
- 返回：成员数组

### `POST /api/families/{id}/members`
- 描述：添加族人
- 请求体（JSON）：
  - `name` (string, 必填)
  - `gen` (number, 必填)
  - `sex` (`M`|`F`, 可选，默认 `M`)
  - `zi`, `hao`, `branch`, `birth`, `birthLunar`, `death`, `deathLunar`, `lifespan`, `title`, `bio`, `burial`, `address`, `phone`, `photo`（可选）
  - `deceased` (boolean, 可选，默认 `false`)
  - `parentId` (string, 可选)
- 返回：新建族人对象

### `PUT /api/families/{id}/members/{personId}`
- 描述：更新指定族人
- 请求体（JSON）：可更新字段
- 返回：更新后的族人对象

### `DELETE /api/families/{id}/members/{personId}`
- 描述：删除指定族人
- 返回：`{ ok: true }`

---

## 3. 配偶 Spouse

### `POST /api/spouses`
- 描述：创建配偶关系
- 请求体（JSON）：
  - `p1Id` (string, 必填)
  - `p2Id` (string, 必填)
  - `label` (string, 可选)
- 返回：创建的配偶关系信息

### `PATCH /api/spouses/{id}`
- 描述：更新配偶关系标签
- 请求体（JSON）：
  - `label` (string 或 `null`)
- 返回：更新后的配偶关系对象

### `DELETE /api/spouses/{id}`
- 描述：删除配偶关系
- 返回：204 No Content

---

## 4. 事件 Events

### `GET /api/families/{id}/events`
- 描述：获取族谱事件列表
- 返回：事件数组

### `POST /api/families/{id}/events`
- 描述：添加事件
- 请求体（JSON）：
  - `title` (string, 必填)
  - `year` (number, 可选)
  - `yearText` (string, 可选)
  - `desc` (string, 可选)
  - `actors` (string[], 可选)
  - `major` (boolean, 可选，默认 `false`)
- 返回：创建的事件对象

---

## 5. 审计 Audit

### `GET /api/families/{id}/audit`
- 描述：获取族谱审计日志
- 权限：仅 `admin` 可访问
- 查询参数：
  - `page`（默认 `1`）
  - `limit`（默认 `50`，最大 `200`）
- 返回：`{ page, limit, total, logs }`

---

## 6. 邀请 Invite

### `POST /api/families/{id}/invite`
- 描述：创建邀请
- 请求体（JSON）：
  - `role` (`admin`|`editor`|`viewer`, 默认 `editor`)
  - `email` (string, 可选)
  - `message` (string, 可选)
- 返回：邀请对象

---

## 7. 权限 Access

### `DELETE /api/families/{id}/access/{accessId}`
- 描述：撤销某人对族谱的访问权限
- 说明：不能删除 `owner`
- 返回：204 No Content

---

## 8. 导出 Export

### `GET /api/families/{id}/export`
- 描述：导出当前族谱为 JSON 文件
- 返回：下载 JSON 文件

---

## 9. 迁移 Migration

### `GET /api/families/{id}/migration`
- 描述：获取家谱迁移 / 树结构数据
- 返回：`{ members: [...] }`

---

## 10. 上传 Upload

### `POST /api/upload`
- 描述：上传图片
- 表单字段：
  - `familyId`
  - `file`（JPG / PNG / WebP / GIF，最大 4 MB）
- 返回：`{ url, familyId }`

---

## 11. 搜索 Search

### `GET /api/search`
- 描述：按族谱成员与事件搜索
- 查询参数：
  - `q` (string, 必填)
  - `familyId` (string, 必填)
  - `page`（可选，默认 `1`）
  - `limit`（可选，默认 `10`，最大 `50`）
- 返回：`{ page, limit, members, events }`

---

## 调用示例

### 获取族谱列表
```bash
curl -X GET "http://localhost:3000/api/families" \
  -H "Cookie: <session_cookie>"
```

### 创建族谱
```bash
curl -X POST "http://localhost:3000/api/families" \
  -H "Content-Type: application/json" \
  -d '{
    "surname":"李",
    "tang":"陇西堂",
    "region":"蜀眉柳溪",
    "access":"semi"
  }'
```

### 获取族谱成员
```bash
curl -X GET "http://localhost:3000/api/families/fam_longxi/members?page=1&limit=50"
```

### 更新族人
```bash
curl -X PUT "http://localhost:3000/api/families/fam_longxi/members/p1" \
  -H "Content-Type: application/json" \
  -d '{"name":"李永昌","branch":"本支"}'
```

### 获取审计日志
```bash
curl -X GET "http://localhost:3000/api/families/fam_longxi/audit?page=1&limit=50"
```

### 上传图片
```bash
curl -X POST "http://localhost:3000/api/upload" \
  -F "familyId=fam_longxi" \
  -F "file=@/path/to/photo.jpg"
```

---

如果需要，我还可以继续把这份文档写入项目 README 或添加到项目首页导航中。
