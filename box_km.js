const MOBILE_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const HOST = 'https://kimivod.com';

// 分类配置
const cateList = [
    {'n':'首页','v':'0'},
    {'n':'电视剧','v':'2'},
    {'n':'电影','v':'1'},
    {'n':'动漫','v':'4'},
    {'n':'综艺','v':'3'},
    {'n':'短剧','v':'5'}
];

/**
 * 主页函数
 */
async function home(filter) {
    try {
        return JSON.stringify({
            class: cateList.map(it => ({
                type_id: it.v,
                type_name: it.n
            }))
        });
    } catch (e) {
        console.log('首页错误:', e);
        return JSON.stringify({
            class: []
        });
    }
}

/**
 * 分类页面
 */
async function category(tid, pg, filter, extend) {
    try {
        let page = parseInt(pg) || 1;
        if (page == 0) page = 1;
        
        // 构造URL，参考原代码的URL构造方式
        let url = '/';
        if (tid !== '0') {
            url = `/vod/show/id/${tid}.html`;
        }
        
        console.log('分类URL:', url);
        
        const limit = 24;
        const apiUrl = `${HOST}/index.php/ajax/data.html`;
        
        // 从URL中提取分类ID，参考原代码的处理方式
        const categoryId = tid === '0' ? 1 : tid;
        
        const params = {
            mid: 1,
            tid: categoryId,
            page: page,
            limit: limit
        };

        console.log('请求参数:', params);

        const resp = await request(apiUrl, {
            method: 'POST',
            headers: {
                'User-Agent': MOBILE_UA,
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${HOST}${url}`
            },
            data: params,
            postType: 'form'  // 确保使用form格式提交
        });

        console.log('接口响应:', resp.content);

        const json = JSON.parse(resp.content);
        const videos = [];
        
        if (json && json.list && Array.isArray(json.list)) {
            json.list.forEach(item => {
                videos.push({
                    vod_id: item.vod_id,
                    vod_name: item.vod_name,
                    vod_pic: item.vod_pic,
                    vod_remarks: item.vod_remarks || "",
                    vod_year: item.vod_year || "",
                    vod_area: item.vod_area || "",
                    vod_actor: item.vod_actor || "",
                    vod_director: item.vod_director || "",
                    vod_content: item.vod_content || ""
                });
            });
        }

        return JSON.stringify({
            page: page,
            pagecount: Math.ceil(json.total/limit),
            limit: limit,
            total: json.total || videos.length,
            list: videos
        });
    } catch (e) {
        console.log('分类页面错误:', e);
        console.log('错误详情:', e.message);
        console.log('错误堆栈:', e.stack);
        return JSON.stringify({
            page: 1,
            pagecount: 1,
            limit: 24,
            total: 0,
            list: []
        });
    }
}

/**
 * 详情页面
 */
async function detail(id) {
    try {
        const url = `${HOST}/index.php/vod/detail/id/${id}.html`;
        const resp = await request(url, {
            headers: {
                'User-Agent': MOBILE_UA,
                'Referer': HOST
            }
        });

        const $ = load(resp.content);
        
        // 获取播放列表
        const playMap = {};
        $('.playno').each((_, element) => {
            const $element = $(element);
            const sourceName = $('.tabs a.active span.max').text().trim();
            const playList = [];
            
            $element.find('a').each((_, item) => {
                const $item = $(item);
                const name = $item.text().trim();
                const playUrl = $item.attr('href');
                playList.push(`${name}$${playUrl}`);
            });
            
            if (playList.length > 0) {
                playMap[sourceName] = playList.join('#');
            }
        });

        const vod = {
            vod_id: id,
            vod_name: $('.title').text().trim(),
            vod_pic: $('.lazyload').attr('data-original'),
            vod_remarks: $('.pic-text').text().trim(),
            vod_content: $('.content').text().trim(),
            vod_play_from: Object.keys(playMap).join('$$$'),
            vod_play_url: Object.values(playMap).join('$$$')
        };

        return JSON.stringify({
            list: [vod]
        });
    } catch (e) {
        console.log('详情页面错误:', e);
        return JSON.stringify({
            list: []
        });
    }
}

/**
 * 搜索功能
 */
async function search(wd) {
    try {
        const url = `${HOST}/search.php?searchword=${encodeURIComponent(wd)}`;
        const resp = await request(url, {
            headers: {
                'User-Agent': MOBILE_UA,
                'Referer': HOST
            }
        });

        const $ = load(resp.content);
        const videos = [];
        
        $('.myui-vodlist__media li').each((_, element) => {
            const $item = $(element);
            const $link = $item.find('.title a');
            const $img = $item.find('.myui-vodlist__thumb');
            const $remark = $item.find('.pic-text');
            
            if ($link.length) {
                const href = $link.attr('href') || '';
                const vod_id = href.split('/').pop().replace('.html', '');
                
                videos.push({
                    vod_id: vod_id,
                    vod_name: $link.text().trim(),
                    vod_pic: $img.data('original') || '',
                    vod_remarks: $remark.text().trim()
                });
            }
        });

        return JSON.stringify({
            list: videos
        });
    } catch (e) {
        console.log('搜索错误:', e);
        return JSON.stringify({
            list: []
        });
    }
}

/**
 * 播放解析
 */
async function play(flag, id, flags) {
    try {
        const url = `${HOST}${id}`;
        const resp = await request(url, {
            headers: {
                'User-Agent': MOBILE_UA,
                'Referer': HOST
            }
        });

        const $ = load(resp.content);
        const script = $('script:contains("file:")').html();
        const playUrl = script.match(/file:"([^"]+)"/)[1];

        return JSON.stringify({
            parse: 0,
            url: playUrl
        });
    } catch (e) {
        console.log('播放解析错误:', e);
        return JSON.stringify({
            parse: 0,
            url: ''
        });
    }
}

export default {
    home: home,
    category: category,
    detail: detail,
    search: search,
    play: play
} 
