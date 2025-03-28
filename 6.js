var rule = {
    title: 'KIMIVOD',
    host: 'https://kimivod.com',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
};

// 首页数据
function home(filter) {
    const classes = [
        { type_id: 1, type_name: "电视剧" },
        { type_id: 2, type_name: "电影" },
        { type_id: 3, type_name: "动漫" },
        { type_id: 4, type_name: "综艺" },
        { type_id: 39, type_name: "短剧" }
    ];
    
    return JSON.stringify({
        class: classes,
        filters: {}
    });
}

// 分类内容
function category(tid, pg, filter, extend) {
    const url = rule.host + '/index.php/ajax/data.html';
    const params = {
        mid: 1,
        tid: parseInt(tid),
        page: parseInt(pg),
        limit: 24
    };
    
    const headers = {
        'User-Agent': rule.ua,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
    };

    try {
        const resp = request(url, {
            method: 'post',
            headers: headers,
            data: params,
            postType: 'form'
        });

        const data = JSON.parse(resp);
        const videos = [];
        
        data.list.forEach(item => {
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
            page: parseInt(pg),
            pagecount: Math.ceil(data.total / 24),
            limit: 24,
            total: data.total,
            list: videos
        });
    } catch (e) {
        log('分类内容获取失败:' + e.message);
        return JSON.stringify({
            list: []
        });
    }
}

// 详情页
function detail(id) {
    const url = rule.host + '/vod/detail/id/' + id + '.html';
    const headers = {
        'User-Agent': rule.ua
    };

    try {
        const html = request(url, {
            headers: headers
        });
        
        const $ = load(html);  // QuickJS 的 load 方法，类似 cheerio
        const vod = {
            vod_id: id,
            vod_name: $('.title').text().trim(),
            vod_pic: $('.pic img').attr('data-original'),
            vod_remarks: $('.pic-text').text().trim(),
            vod_content: $('.detail-content').text().trim()
        };

        const playLists = [];
        $('.playno').each((list) => {
            const title = $('.tabs a.active span.max').text().trim();
            const episodes = [];
            
            $(list).find('a').each((item) => {
                episodes.push(
                    $(item).text().trim() + '$' + $(item).attr('href')
                );
            });

            if (episodes.length > 0) {
                playLists.push(title + '$$$' + episodes.join('#'));
            }
        });

        vod.vod_play_from = playLists.map((_, i) => '播放列表' + (i + 1)).join('$$$');
        vod.vod_play_url = playLists.join('$$$');

        return JSON.stringify({
            list: [vod]
        });
    } catch (e) {
        log('详情页获取失败:' + e.message);
        return JSON.stringify({
            list: []
        });
    }
}

// 搜索
function search(wd, quick) {
    const url = 'https://cn.kimivod.com/search.php?searchword=' + encodeURIComponent(wd);
    const headers = {
        'User-Agent': rule.ua
    };

    try {
        const html = request(url, {
            headers: headers
        });
        
        const $ = load(html);
        const videos = [];
        
        $('.myui-vodlist__media li').each((item) => {
            const $link = $(item).find('.title a');
            const $img = $(item).find('.myui-vodlist__thumb');
            const $remark = $(item).find('.pic-text');
            
            if ($link) {
                const href = $link.attr('href') || '';
                const vod_id = href.split('/').filter(s => s).pop() || '';
                
                videos.push({
                    vod_id: vod_id,
                    vod_name: $link.text().trim(),
                    vod_pic: $img.attr('data-original') || '',
                    vod_remarks: $remark.text().trim()
                });
            }
        });

        return JSON.stringify({
            list: videos
        });
    } catch (e) {
        log('搜索失败:' + e.message);
        return JSON.stringify({
            list: []
        });
    }
}

// 播放内容
function play(flag, id, flags) {
    try {
        const html = request(id, {
            headers: {
                'User-Agent': rule.ua
            }
        });
        
        const $ = load(html);
        const script = $('script:contains("file:")').text();
        const match = script.match(/file:"([^"]+)"/);
        
        if (match && match[1]) {
            return JSON.stringify({
                parse: 0,
                url: match[1]
            });
        }
        
        return JSON.stringify({
            parse: 0,
            url: ''
        });
    } catch (e) {
        log('播放地址获取失败:' + e.message);
        return JSON.stringify({
            parse: 0,
            url: ''
        });
    }
}

// 初始化
function init(ext) {
    log('init with ext:' + ext);
}

export {
    init,
    home,
    homeVod,
    category,
    detail,
    play,
    search
}
