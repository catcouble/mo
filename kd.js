const cheerio = createCheerio()
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
const headers = {
  'User-Agent': UA,
}

const appConfig = {
  ver: 1,
  title: "KIMIVOD",
  site: "https://kimivod.com",
  tabs: [{
    name: '首页',
    ext: {
      url: '/',
      hasMore: false
    },
  }, {
    name: '电视剧',
    ext: {
      url: '/vod/show/id/2.html'
    },
  }, {
    name: '电影',
    ext: {
      url: '/vod/show/id/1.html'
    },
  }, {
    name: '动漫',
    ext: {
      url: '/vod/show/id/4.html'
    },
  }, {
    name: '综艺',
    ext: {
      url: '/vod/show/id/3.html'
    },
  }, {
    name: '短剧',
    ext: {
      url: '/vod/show/id/5.html'
    },
  }]
}

async function getConfig() {
  return jsonify(appConfig)
}

async function getCards(ext) {
  ext = argsify(ext)
  let cards = []
  let url = ext.url
  let page = ext.page || 1
  
  $print(`[kimivodjs] 开始获取列表: ${url}, 页码: ${page}`)
  
  // 构造API请求URL
  const apiUrl = `/index.php/ajax/data.html`
  const params = {
    mid: 1,
    tid: url.match(/id\/(\d+)/)?.[1] || 1,
    page: page,
    limit: 24  // 每页数量
  }
  
  $print(`[kimivodjs] 请求API: ${apiUrl}, 参数:`, params)

  const { data } = await $fetch.post(appConfig.site + apiUrl, params, {
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  
  $print(`[kimivodjs] API响应:`, data)

  try {
    console.log('[kimivodjs] 开始解析数据');
    
    // 先将JSON字符串解析为对象
    const jsonData = JSON.parse(data);
    console.log('[kimivodjs] JSON解析结果:', jsonData);
    
    const cards = jsonData.list.map((item, index) => {
      console.log(`[kimivodjs] 正在处理第 ${index + 1} 个视频:`, {
        id: item.vod_id,
        name: item.vod_name,
        detail_link: item.detail_link
      });
      
      return {
        vod_id: item.vod_id,
        vod_name: item.vod_name,
        vod_pic: item.vod_pic,
        vod_remarks: item.vod_remarks,
        vod_year: item.vod_year,
        vod_area: item.vod_area,
        vod_actor: item.vod_actor,
        vod_director: item.vod_director,
        vod_content: item.vod_content,
        ext: {
            url: appConfig.site + item.detail_link // 构建完整的详情页URL
        }
      };
    });

    console.log(`[kimivodjs] 成功解析 ${cards.length} 个视频条目`);
    return { list: cards };
    
  } catch (err) {
    console.error('[kimivodjs] 解析数据失败:', err);
    console.error('[kimivodjs] 原始数据类型:', typeof data);
    return { list: [] };
  }
}


async function getTracks(ext) {
  const { url } = argsify(ext)
  let groups = []

  $print(`[kimivodjs] 开始获取剧集: ${url}`)

  const { data } = await $fetch.get(url, {
    headers
  })
  
  const $ = cheerio.load(data)

  // 获取播放列表
  $('.playno').each((_, list) => {
    const $list = $(list)
    // 从tabs获取标题
    const title = $('.tabs a.active span.max').text().trim()
    
    const tracks = []
    $list.find('a').each((_, item) => {
      const $item = $(item)
      tracks.push({
        name: $item.text().trim(),
//        url: $item.attr('href')
        ext: {
                url: $item.attr('href')
             }
        })
    })

    if(tracks.length > 0) {
      groups.push({
        title,
        tracks
      })
    }
  })

  $print(`[kimivodjs] 获取到 ${groups.length} 个播放列表组`)
  return jsonify({
    list: groups
  })
}




async function getPlayinfo(ext) {
  const { url } = argsify(ext)
  $print(`[kimivodjs] 开始获取播放地址: ${url}`)
  
  const { data } = await $fetch.get(url, {
    headers
  })
  
  const $ = cheerio.load(data)
  
  // 获取播放器配置
  const playerScript = $('script:contains("file:")').html()
  if (!playerScript) {
    $print(`[kimivodjs] 未找到播放器配置`)
    return jsonify({
      urls: []
    })
  }
  
  try {
    // 提取播放地址
    const fileMatch = playerScript.match(/file:"([^"]+)"/);
    if (fileMatch && fileMatch[1]) {
      const playUrl = fileMatch[1]
      $print(`[kimivodjs] 获取到播放地址: ${playUrl}`)
      return jsonify({
        urls: [playUrl]
      })
    }
    
    $print(`[kimivodjs] 未能获取到播放地址`)
    return jsonify({
      urls: []
    })
    
  } catch (err) {
    $print(`[kimivodjs] 解析播放地址失败: ${err}`)
    return jsonify({
      urls: []
    })
  }
}


async function search(ext) {
  try {
    const { text } = argsify(ext)
    if (!text) {
      return jsonify({
        list: []
      })
    }

    $print(`[kimivodjs] 开始搜索: ${text}`)
    
    const url = `https://cn.kimivod.com/search.php?searchword=${encodeURIComponent(text)}`
    const { data } = await $fetch.get(url, {
      headers
    })

    const $ = cheerio.load(data)
    const list = []

    // 修改解析逻辑
    $('.myui-vodlist__media li').each((_, item) => {
      const $item = $(item)
      const $link = $item.find('.title a')
      const $img = $item.find('.myui-vodlist__thumb')
      const $remark = $item.find('.pic-text')
      
      if ($link.length) {
        const href = $link.attr('href') || ''
        const vod_id = href.split('/').filter(Boolean).pop() || ''
        
        list.push({
          vod_id,
          vod_name: $link.text().trim(),
          vod_pic: $img.data('original') || '',
          vod_remarks: $remark.text().trim(),
          ext: {
            url: href // 构建完整的详情页URL
          }
        })
      }
    })

    $print(`[kimivodjs] 搜索到 ${list.length} 个结果`)
    return jsonify({
      list
    })

  } catch (err) {
    $print(`[kimivodjs] 搜索失败: ${err}`)
    return jsonify({
      list: []
    })
  }
}

module.exports = {
    getConfig,
    getCards,
    getTracks,
    getPlayinfo,
    search
  }
  
  
