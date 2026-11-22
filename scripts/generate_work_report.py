from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUT = Path(r"C:\Users\denco\Desktop\saytpraktika-main\Отчет о проделанной работе 01 SERVICE.docx")

NAVY = "000000"
RED = "000000"
LIGHT_BLUE = "FFFFFF"
PALE_BLUE = "FFFFFF"
GRAY = "D9D9D9"
TEXT = "000000"
MUTED = "000000"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=110, start=130, bottom=110, end=130):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color=GRAY, size="6"):
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_widths(table, widths):
    for row in table.rows:
        for cell, width in zip(row.cells, widths):
            cell.width = Inches(width)


def style_run(run, size=10.5, bold=False, color=TEXT, italic=False):
    run.font.name = "Arial"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)


def format_paragraph(paragraph, space_after=6, line=1.12):
    paragraph.paragraph_format.space_after = Pt(space_after)
    paragraph.paragraph_format.line_spacing = line


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Стр. ")
    style_run(run, 8, color=MUTED)
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr_text)
    run._r.append(fld_char2)


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f"Heading {level}")
    run = p.add_run(text)
    style_run(run, 16 if level == 1 else 12.5, bold=True, color="000000")
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.space_after = Pt(5)
    return p


def add_body(doc, text, bold_lead=None):
    p = doc.add_paragraph(style="Body Text")
    if bold_lead and text.startswith(bold_lead):
        r = p.add_run(bold_lead)
        style_run(r, bold=True)
        r2 = p.add_run(text[len(bold_lead):])
        style_run(r2)
    else:
        r = p.add_run(text)
        style_run(r)
    format_paragraph(p)
    return p


def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    r = p.add_run(text)
    style_run(r)
    format_paragraph(p, space_after=3, line=1.08)
    return p


def add_number(doc, text):
    p = doc.add_paragraph(style="List Number")
    r = p.add_run(text)
    style_run(r)
    format_paragraph(p, space_after=3, line=1.08)
    return p


def add_table(doc, headers, rows, widths=None):
    # Use Word's plain Table Grid style: white cells and standard black borders.
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.autofit = True
    for cell, value in zip(table.rows[0].cells, headers):
        cell.text = str(value)
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.bold = True
                run.font.name = "Arial"
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(0, 0, 0)
    for row_data in rows:
        cells = table.add_row().cells
        for cell, value in zip(cells, row_data):
            cell.text = str(value)
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.space_after = Pt(2)
                paragraph.paragraph_format.line_spacing = 1.05
                for run in paragraph.runs:
                    run.font.name = "Arial"
                    run.font.size = Pt(10)
                    run.font.color.rgb = RGBColor(0, 0, 0)
    if widths:
        set_widths(table, widths)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(3)
    return table


def add_status(doc, status, explanation):
    p = doc.add_paragraph(style="Body Text")
    r = p.add_run(status + ". ")
    style_run(r, bold=True)
    r2 = p.add_run(explanation)
    style_run(r2)
    format_paragraph(p, space_after=5)
    return p


def add_code_line(doc, text):
    p = doc.add_paragraph(style="Body Text")
    r = p.add_run(text)
    style_run(r, 10.5)
    p.paragraph_format.left_indent = Inches(0.22)
    p.paragraph_format.space_after = Pt(2)
    return p


def configure_document(doc):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.95)
    section.right_margin = Inches(0.8)
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor.from_string(TEXT)
    body = styles["Body Text"]
    body.font.name = "Arial"
    body._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    body._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    body.font.size = Pt(11)
    body.font.color.rgb = RGBColor.from_string(TEXT)
    for name, size in (("Heading 1", 14), ("Heading 2", 12), ("Heading 3", 11)):
        style = styles[name]
        style.font.name = "Arial"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
    if "Code" not in styles:
        code = styles.add_style("Code", WD_STYLE_TYPE.PARAGRAPH)
        code.font.name = "Consolas"
        code._element.rPr.rFonts.set(qn("w:ascii"), "Consolas")
        code._element.rPr.rFonts.set(qn("w:hAnsi"), "Consolas")
        code.font.size = Pt(9)
    # Keep the report free from decorative footers.


def build_report():
    doc = Document()
    configure_document(doc)

    # Simple opening without a separate cover page or decorative elements.
    p = doc.add_paragraph(style="Title")
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("Отчёт о проделанной работе")
    style_run(r, 18, bold=True)
    add_body(doc, "Проект: сайт 01 SERVICE (saytpraktika-main). Дата отчёта: 22 ноября 2026 года.")
    add_body(doc, "В отчёте последовательно описана работа над сайтом с первого запроса в диалоге: интерфейс, каталог, услуги, backend, PostgreSQL, админ-панель, рыночные данные, графики, Telegram-бот и запуск проекта.")

    add_heading(doc, "Содержание", 1)
    for item in [
        "1. Исходный запрос и исходное состояние",
        "2. Хронология работы по диалогу",
        "3. Изменения пользовательской части сайта",
        "4. Каталог товаров и майнинг-оборудования",
        "5. Услуги и Telegram-бот",
        "6. Backend и API",
        "7. PostgreSQL и структура данных",
        "8. Админ-панель",
        "9. Курсы валют, конвертер и графики",
        "10. Docker и запуск проекта",
        "11. Проверка текущего состояния",
        "12. Что осталось настроить или подтвердить",
        "13. Итоговый статус проекта",
    ]:
        add_number(doc, item)

    add_heading(doc, "1. Исходный запрос и исходное состояние", 1)
    add_body(doc, "Работа началась с просьбы запустить проект saytpraktika-main, расположенный на рабочем столе. После запуска проекта в диалоге последовательно появились задачи по ТЗ, валютам, отзывам, админ-панели, базе PostgreSQL, Telegram-боту, Docker, каталогам, графикам и запуску production-версии.")
    add_body(doc, "В качестве требований использовались мини-ТЗ и затем полный документ «Техническое задание 01 SERVICE». Отдельно было уточнено, что итоговое понятное ТЗ не должно содержать графиков. Позднее графики были добавлены уже в сам сайт как отдельный функциональный раздел по новому запросу пользователя.")
    add_heading(doc, "Главные цели, которые сформировались в процессе", 2)
    for line in [
        "сделать рабочий сайт 01 SERVICE с товарами, услугами, конвертером и новостями",
        "подключить backend и PostgreSQL",
        "обеспечить администрирование заказов, заявок, отзывов и каталога",
        "продавать майнеры через сайт, а услуги оформлять через Telegram-бота",
        "использовать USD в ценах и автоматически обновлять рыночные курсы",
        "обеспечить запуск в Docker и отдельный локальный dev-запуск",
    ]:
        add_bullet(doc, line)

    add_heading(doc, "2. Хронология работы по диалогу", 1)
    add_table(doc, ["Этап", "Запрос или решение", "Что было сделано"], [
        ["1", "Запуск проекта saytpraktika-main", "Проект был поднят локально, затем проверены dev- и production-режимы."],
        ["2", "Подготовка полного ТЗ по мини-ТЗ", "Сформирована расширенная структура требований. По уточнению пользователя ТЗ изложено без графиков."],
        ["3", "Актуальные курсы, USD и отзывы", "Добавлена бегущая строка курсов, единая валюта USD и блоки отзывов. На первом этапе отзывы только показывались."],
        ["4", "Админ-аккаунт и админ-панель", "Создана серверная авторизация с ролью admin и расширена панель управления."],
        ["5", "Полноценная БД PostgreSQL", "Добавлены схема данных, миграции, сессии, заказы, заявки, отзывы, каталог, журнал и настройки."],
        ["6", "Полная реализация требований ТЗ", "Добавлены ограничения оформления заказа после входа, серверные проверки, модерация отзывов и управление статусами."],
        ["7", "Telegram для услуг", "Подготовлен встроенный polling-бот, который собирает заявки на услуги и записывает их в БД."],
        ["8", "Backend, Docker и запуск", "Исправлены переменные окружения, bcrypt-хеш для Docker, запуск PostgreSQL и production web-контейнера."],
        ["9", "Пустой каталог", "Добавлена одна тестовая карточка майнера с нулевым остатком для проверки каталога."],
        ["10", "Графики и единый каталог", "Графики получили новый дизайн и автообновление. Майнеры перенесены в раздел «Товары»."],
    ], [0.5, 2.25, 3.9])

    add_heading(doc, "3. Изменения пользовательской части сайта", 1)
    add_body(doc, "Интерфейс был приведён к единой структуре 01 SERVICE. Сайт использует фирменную красную палитру, логотип 01, шрифт Inter с резервными шрифтами, адаптивные сетки, карточки, фильтры и состояния загрузки.")
    add_heading(doc, "Обновлённые страницы и блоки", 2)
    add_table(doc, ["Раздел", "Изменения"], [
        ["Главная", "Добавлены блоки «Как начать», пояснение по заказу услуг через Telegram, переход к товарам и обзор рынка."],
        ["Услуги", "Восемь услуг с описанием, составом работ, технологиями, сроками, преимуществами и кнопкой оформления в Telegram."],
        ["Товары", "Единый каталог майнеров, компьютеров и серверов с категориями, поиском, фильтрами, сортировкой, остатком, ценой, характеристиками и отзывами."],
        ["Графики", "Рынок, выбор актива и валюты, периоды 1H–90D, график, история, метрики, топ капитализации и автообновление."],
        ["Конвертер", "Динамический список криптовалют, USD/RUB, конвертация через единую USD-базу, ручное обновление и отметка свежести данных."],
        ["Корзина", "Товары отделены от услуг. Перед оформлением заказа требуется вход в аккаунт."],
        ["Профиль", "Регистрация, вход, профиль, пароль, заказы и история статусов."],
        ["Новости", "Подключена серверная лента новостей с кэшированием."],
        ["Юридические страницы", "Добавлены политика конфиденциальности и согласие на обработку персональных данных."],
    ], [1.35, 5.3])
    add_heading(doc, "Бегущая строка и валюты", 2)
    add_body(doc, "В шапке сайта добавлена бегущая строка с BTC/USD, ETH/USD и BTC/ETH. Рынок загружается через серверный API. Цены товаров, заказов и доставки хранятся в USD. Конвертер получает текущий курс USD/RUB и показывает время обновления.")

    add_heading(doc, "4. Каталог товаров и майнинг-оборудования", 1)
    add_body(doc, "Изначально майнинг-оборудование находилось на отдельной странице /mining. По последнему запросу оно перенесено в единый раздел /products. Теперь пользователь видит в одном каталоге компьютеры, серверы и майнеры.")
    add_heading(doc, "Что есть в каталоге", 2)
    for line in [
        "переключатели «Все товары», «Майнеры», «Компьютеры и серверы»",
        "поиск по названию и описанию",
        "фильтр по наличию",
        "сортировка по новизне, цене и рейтингу",
        "карточки с изображением, ценой USD, остатком, гарантией и характеристиками",
        "страница подробного товара",
        "кнопка добавления в корзину только для доступного товара",
        "кнопка «Задать вопрос» для недоступной позиции",
        "обратное перенаправление старого адреса /mining на вкладку майнеров",
    ]:
        add_bullet(doc, line)
    add_heading(doc, "Тестовая модель", 2)
    add_table(doc, ["Поле", "Значение"], [
        ["Название", "Тестовый ASIC-майнер (витрина)"],
        ["Категория", "miner"],
        ["Цена", "$1 (тестовая цена)"],
        ["Остаток", "0 шт."],
        ["Покупка", "Отключена"],
        ["Назначение", "Проверка отображения каталога, фильтров, карточки и страницы товара"],
    ], [1.55, 5.1])
    add_status(doc, "Требует данных", "Для настоящих продаж нужны подтверждённые модели, цены, фотографии, характеристики и остатки. Тестовая модель не является коммерческим предложением.")

    add_heading(doc, "5. Услуги и Telegram-бот", 1)
    add_body(doc, "Услуги остаются видимыми на сайте, но оформление заявки вынесено в Telegram. На странице услуг опубликованы восемь направлений: Frontend React, вёрстка, UI/UX-дизайн, Backend Python/Django, API-разработка, администрирование БД, Full-stack и техническая консультация.")
    add_heading(doc, "Сценарий бота", 2)
    for line in [
        "пользователь открывает бота через deep link с выбранной услугой",
        "бот показывает выбранную услугу и документы по обработке данных",
        "пользователь подтверждает согласие",
        "бот запрашивает имя, телефон и описание задачи",
        "заявка сохраняется в PostgreSQL с источником telegram",
        "уведомление попадает в очередь backend",
        "заявка доступна в админ-панели",
    ]:
        add_bullet(doc, line)
    add_status(doc, "Код готов, требуется настройка", "В .env не задан TELEGRAM_BOT_TOKEN и не включён TELEGRAM_BOT_ENABLED. Поэтому production-бот не выполняет polling, а кнопка сайта не может открыть реальный Telegram-аккаунт.")

    add_heading(doc, "6. Backend и API", 1)
    add_body(doc, "Backend реализован на Node.js с модулем pg для PostgreSQL. Он отдаёт API, обслуживает аутентификацию, каталог, корзину, заказы, отзывы, заявки, настройки и рыночные данные. В production тот же Node-процесс отдаёт собранный React build и API.")
    add_heading(doc, "Основные API-группы", 2)
    add_table(doc, ["Группа", "Назначение"], [
        ["/api/health", "Проверка backend, базы, статической сборки и настроек Telegram."],
        ["/api/auth", "Регистрация, вход, выход, текущий пользователь, профиль и смена пароля."],
        ["/api/products", "Публичный каталог и карточка товара."],
        ["/api/cart", "Корзина аккаунта, объединение локальной корзины и проверка остатков."],
        ["/api/orders", "Создание, просмотр и отмена заказов. Заказ требует входа."],
        ["/api/reviews", "Публичные одобренные отзывы и отправка отзыва из завершённого заказа."],
        ["/api/leads", "Заявки с сайта и очередь уведомлений."],
        ["/api/crypto", "Рынки, отдельный актив, исторические цены и USD/RUB."],
        ["/api/admin", "Админ-операции для заказов, заявок, отзывов, клиентов, каталога и настроек."],
    ], [1.7, 4.95])
    add_heading(doc, "Защита и серверные проверки", 2)
    for line in [
        "админский доступ ограничен ролью admin",
        "сессии хранятся в PostgreSQL, cookie имеет httpOnly и SameSite=Lax",
        "для входа действует ограничение попыток",
        "заказ проверяет товар, валюту USD, цену, остаток и актуальность позиции",
        "отзыв можно оставить только по завершённому заказу",
        "ошибки API возвращают requestId без SQL и стека исключения",
        "уведомления хранятся в outbox и могут быть отправлены повторно из админ-панели",
    ]:
        add_bullet(doc, line)

    add_heading(doc, "7. PostgreSQL и структура данных", 1)
    add_body(doc, "PostgreSQL работает в Docker-контейнере postgres:16-alpine. Схема создаётся при запуске backend, затем применяются последовательные SQL-миграции.")
    add_table(doc, ["Таблица или объект", "Назначение"], [
        ["users", "Покупатели и администраторы, роли, контакты, активность и согласие."],
        ["sessions", "Серверные сессии пользователей."],
        ["products", "Каталог, USD-цены, SKU, slug, остатки, изображения и JSON-характеристики."],
        ["user_cart_items", "Корзина авторизованного пользователя."],
        ["orders / order_items", "Заказы и снимки товаров на момент оформления."],
        ["order_status_history", "История изменения статусов заказа."],
        ["leads", "Заявки сайта и Telegram-бота."],
        ["reviews", "Отзывы и статусы модерации."],
        ["notification_outbox", "Очередь уведомлений и повторные попытки."],
        ["crypto_cache / crypto_chart_cache", "Кэш рыночных курсов и истории графиков."],
        ["site_settings", "Контакты, Telegram-ссылка, доставка и интервалы."],
        ["admin_audit_log / api_request_log", "Журнал действий администратора и запросов."],
    ], [2.05, 4.6])
    add_heading(doc, "Миграции", 2)
    for line in [
        "001_complete_requirements.sql — базовые поля ТЗ, статусы, доставки, кэш и настройки",
        "002_account_cart.sql — корзина аккаунта",
        "003_crypto_cache.sql — кэш криптовалют",
        "004_product_publication.sql — правила публикации каталога",
        "005_delivery_intervals.sql — интервалы доставки",
        "006_audit_request_id.sql — аудит и requestId",
        "006_telegram_sales_bot.sql — состояние Telegram-бота",
        "007_product_specifications.sql — обязательные характеристики товаров",
        "008_test_catalog_product.sql — тестовая карточка майнера",
    ]:
        add_bullet(doc, line)

    add_heading(doc, "8. Админ-панель", 1)
    add_body(doc, "Админ-панель доступна по адресу /admin после входа с ролью admin. Она использует отдельные защищённые API и не показывает пароли или сессионные данные.")
    add_table(doc, ["Раздел", "Возможности"], [
        ["Обзор", "Сводка новых заявок, активных заказов, отзывов и клиентов."],
        ["Заявки", "Поиск, фильтры, тип заявки, статусы, пагинация и экспорт CSV."],
        ["Заказы", "Поиск, статусы, отмена с причиной, история и экспорт."],
        ["Отзывы", "Просмотр отзывов, одобрение, отклонение, скрытие и удаление."],
        ["Клиенты", "Поиск пользователей, роли и статус учётной записи."],
        ["Каталог", "Создание и редактирование ПК, серверов и майнеров, публикация и скрытие."],
        ["Уведомления", "Очередь, ошибки и ручной повтор отправки."],
        ["Контакты и доставка", "Telegram, MAX, email, телефон, зоны, интервалы и USD-доставка."],
        ["Журнал", "Аудит административных действий и requestId."],
    ], [1.95, 4.7])
    add_status(doc, "Реализовано", "Админ-панель является рабочей частью проекта. Для входа используется ADMIN_USERNAME и bcrypt-хеш ADMIN_PASSWORD_HASH из .env.")

    add_heading(doc, "9. Курсы валют, конвертер и графики", 1)
    add_heading(doc, "Источники и обновление", 2)
    add_body(doc, "Backend получает данные рынков и исторические цены через внешнее API, сохраняет рабочие значения в PostgreSQL-кэш и отдаёт клиенту признак stale при временной недоступности источника. Благодаря этому сайт может показать последние сохранённые данные, а не пустой блок.")
    add_table(doc, ["Компонент", "Текущая логика"], [
        ["Бегущая строка", "Показывает BTC/USD, ETH/USD, BTC/ETH и время обновления."],
        ["CryptoRatesContext", "Получает рынки каждую минуту, сохраняет данные в localStorage и обновляет страницы сайта."],
        ["Конвертер", "Поддерживает USD, RUB и динамически полученные криптовалюты, включая BTC, ETH, USDT, BNB, USDC, XRP, SOL и TRX."],
        ["График", "Поддерживает BTC, ETH, BNB, SOL, ADA, XRP, DOGE, LTC и валюты USD, RUB, BTC, ETH."],
        ["История", "Показывает последние значения и процентное изменение между точками."],
        ["Автообновление", "График и метрики обновляются каждую минуту, ручная кнопка запускает обновление сразу."],
        ["Fallback", "При сбое источника остаётся последний сохранённый результат с отметкой устаревших данных."],
    ], [1.55, 5.1])
    add_status(doc, "Проверено", "На момент проверки API графика BTC/USD за 7 дней вернул 169 точек, updatedAt был заполнен, stale=false.")

    add_heading(doc, "10. Docker и запуск проекта", 1)
    add_body(doc, "Для локальной базы используется docker-compose.yml. Docker Desktop был запущен, PostgreSQL-контейнер поднят и прошёл healthcheck. Затем production web-контейнер был собран и запущен на порту 8080.")
    add_table(doc, ["Сервис", "Порт", "Состояние"], [
        ["PostgreSQL", "127.0.0.1:5434 → 5432", "healthy"],
        ["Backend dev", "localhost:3001", "работает"],
        ["Frontend dev", "localhost:3000", "работает через npm start"],
        ["Production web", "localhost:8080", "healthy, отдаёт сайт и API"],
    ], [1.65, 2.35, 2.65])
    add_heading(doc, "Исправления запуска", 2)
    for line in [
        "добавлено восстановление $$ в bcrypt-хеше при Docker-запуске",
        "описано экранирование bcrypt-хеша в README и DEPLOY",
        "добавлен scripts/start-frontend.js, который принудительно использует порт 3000",
        "PORT=3001 оставлен для API, чтобы npm start и backend не конфликтовали",
        "Docker build web был повторно выполнен после последних изменений",
    ]:
        add_bullet(doc, line)
    add_heading(doc, "Команды запуска", 2)
    for line in [
        "npm run db:up",
        "npm run dev:api",
        "npm start",
        "docker compose up -d --build web",
    ]:
        add_code_line(doc, line)

    add_heading(doc, "11. Проверка текущего состояния", 1)
    add_body(doc, "Финальная проверка проводилась по API, Docker и визуально в браузере. Проверены production-страницы графиков и товаров, включая историю цены и вкладку майнеров.")
    add_table(doc, ["Проверка", "Результат"], [
        ["GET /api/health на 3001", "ok=true, database=true"],
        ["GET /api/health на 8080", "ok=true, database=true, static=true"],
        ["GET /api/products", "1 тестовый товар"],
        ["Тестовая модель", "видна в каталоге, покупка отключена из-за stock=0"],
        ["GET /api/crypto/chart", "BTC/USD, 7 дней, 169 точек, stale=false"],
        ["Production Docker", "db healthy, web healthy"],
        ["npm run build", "Compiled successfully"],
        ["Старый /mining", "редирект на /products?category=miner"],
        ["Графики в браузере", "новый дизайн, LIVE, история, метрики и автообновление"],
        ["Каталог в браузере", "единый раздел товаров с вкладкой майнеров"],
    ], [2.5, 4.15])
    add_heading(doc, "12. Что осталось настроить или подтвердить", 1)
    add_table(doc, ["Пункт", "Состояние", "Что нужно"], [
        ["Реальные товары", "Не заполнены", "Передать подтверждённые модели, цены, фото, характеристики и остатки."],
        ["Telegram-бот", "Код готов, выключен", "Задать TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_ENABLED=true и PUBLIC_TELEGRAM_BOT_URL."],
        ["Ссылка кнопки услуг", "Не задана", "Указать ссылку вида https://t.me/имя_бота в админ-панели или .env."],
        ["Реальные отзывы", "Нет опубликованных", "Создать завершённые заказы и пройти модерацию отзывов."],
        ["MAX", "Не настроен", "При необходимости добавить webhook и URL MAX."],
        ["GitHub push", "Не подтверждён для текущей версии", "Папка проекта не является Git checkout; актуальные изменения нужно отдельно закоммитить и отправить."],
    ], [1.45, 1.75, 3.45])
    add_status(doc, "Важно", "Внешние токены, реальные товарные данные и публикация в GitHub не были выдуманы и не подставлялись автоматически.")

    add_heading(doc, "13. Итоговый статус проекта", 1)
    add_body(doc, "Сайт собран как рабочая система с React-интерфейсом, Node.js backend, PostgreSQL и Docker. Реализованы основные сценарии из ТЗ: каталог, товары в USD, аккаунты, заказ с обязательным входом, заявки, отзывы с модерацией, админ-панель, рыночные курсы, конвертер, графики, кэширование и история.")
    add_body(doc, "На текущем этапе проект технически запускается и проверяется локально. Для перехода от демонстрационной версии к реальной эксплуатации требуется заполнить каталог подтверждёнными товарами, задать Telegram-токен и ссылку бота, а затем отдельно выполнить commit и push текущей версии в GitHub.")
    add_body(doc, "Основные ссылки для проверки: http://localhost:3000 — dev-сайт, http://localhost:8080 — production Docker, http://localhost:3000/admin — админ-панель после входа администратора.")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build_report()
