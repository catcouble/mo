const MOBILE_UA = "Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36";

// 基础配置
const HOST = 'https://kimivod.com';
const siteKey = 'kimivod';
const siteType = 0;
const siteUrl = HOST;

// 主页地址
const homeUrl = HOST;

// 分类配置
const cateList = [
    {'n':'首页','v':''},
    {'n':'电视剧','v':'2'},
    {'n':'电影','v':'1'},
    {'n':'动漫','v':'4'},
    {'n':'综艺','v':'3'},
    {'n':'短剧','v':'5'}
];

// 筛选配置
const filterObj = {};

/**
 * 主页函数
 */
async function home(filter) {
    const classes = [];
    cateList.forEach(item => {
        classes.push({
            type_id: item.v,
            type_name: item.n
        });
    });
    return JSON.stringify({
        class: classes
    });
}

/**
 * 分类页面
 */
async function category(tid, pg, filter, extend) {
    let page = pg || 1;
    if (page == 0) page = 1;
    
    const limit = 24;
    const url = `${HOST}/index.php/ajax/data.html`;
    
    const params = {
        mid: 1,
        tid: tid || 1,
        page: page,
        limit: limit
    };

    const resp = await request(url, {
        method: 'POST',
        headers: {
            'User-Agent': MOBILE_UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        },
        data: params,
        postType: 'form'
    });

    const json = JSON.parse(resp.content);
    const videos = [];
    
    json.list.forEach(item => {
        videos.push({
            vod_id: item.vod_id,
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: item.vod_remarks,
            vod_year: item.vod_year,
            vod_area: item.vod_area,
            vod_actor: item.vod_actor,
            vod_director: item.vod_director,
            vod_content: item.vod_content
        });
    });

    return JSON.stringify({
        page: page,
        pagecount: Math.ceil(json.total/limit),
        limit: limit,
        total: json.total,
        list: videos
    });
}

/**
 * 详情页面
 */
async function detail(id) {
    const url = `${HOST}/index.php/vod/detail/id/${id}.html`;
    const resp = await request(url, {
        headers: {
            'User-Agent': MOBILE_UA
        }
    });

    const $ = load(resp.content);
    const vod = {
        vod_id: id,
        vod_name: $('.title').text().trim(),
        vod_pic: $('.lazyload').attr('data-original'),
        vod_remarks: $('.pic-text').text().trim(),
        vod_content: $('.content').text().trim()
    };

    const playMap = {};
    $('.playlist').each((index, element) => {
        const sourceName = $(element).find('.title').text().trim();
        const playList = [];
        $(element).find('a').each((i, el) => {
            const name = $(el).text().trim();
            const playUrl = $(el).attr('href');
            playList.push(`${name}$${playUrl}`);
        });
        playMap[sourceName] = playList.join('#');
    });

    vod.vod_play_from = Object.keys(playMap).join('$$$');
    vod.vod_play_url = Object.values(playMap).join('$$$');

    return JSON.stringify({
        list: [vod]
    });
}

/**
 * 搜索功能
 */
async function search(wd, quick) {
    const url = `${HOST}/search.php?searchword=${encodeURIComponent(wd)}`;
    const resp = await request(url, {
        headers: {
            'User-Agent': MOBILE_UA
        }
    });

    const $ = load(resp.content);
    const videos = [];
    
    $('.myui-vodlist__media li').each((index, element) => {
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
}

/**
 * 播放解析
 */
async function play(flag, id, flags) {
    const url = `${HOST}${id}`;
    const resp = await request(url, {
        headers: {
            'User-Agent': MOBILE_UA
        }
    });

    const $ = load(resp.content);
    const script = $('script:contains("file:")').html();
    const playUrl = script.match(/file:"([^"]+)"/)[1];

    return JSON.stringify({
        parse: 0,
        url: playUrl
    });
}

export default {
    init: async (cfg) => {
        // 初始化配置
    },
    home: home,
    category: category,
    detail: detail,
    search: search,
    play: play
} 
