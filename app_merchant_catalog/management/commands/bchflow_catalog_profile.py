"""Read-only DB/render timings, with no account data or credentials in output."""
import statistics
import time
from django.core.management.base import BaseCommand
from django.db import connection
from django.test import RequestFactory
from app_merchant_catalog.software_views import storefront


class Command(BaseCommand):
    help = 'Measure public BCH Flow catalog rendering without payments or external media downloads.'

    def add_arguments(self, parser):
        parser.add_argument('--runs', type=int, default=3)

    def handle(self, *args, **options):
        totals, sql_times, query_counts = [], [], []
        response = None
        for _ in range(min(10, max(1, options['runs']))):
            query_times = []
            def measure(execute, sql, params, many, context):
                start = time.perf_counter()
                try:
                    return execute(sql, params, many, context)
                finally:
                    query_times.append(time.perf_counter()-start)
            start = time.perf_counter()
            with connection.execute_wrapper(measure):
                response = storefront(RequestFactory().get('/bch-flow/software/'))
            totals.append((time.perf_counter()-start)*1000)
            sql_times.append(sum(query_times)*1000)
            query_counts.append(len(query_times))
        self.stdout.write(f'Runs: {len(totals)}; status: {response.status_code}; HTML bytes: {len(response.content)}')
        self.stdout.write(f'Median total: {statistics.median(totals):.1f} ms; SQL: {statistics.median(sql_times):.1f} ms; queries: {statistics.median(query_counts):g}')
        self.stdout.write('Includes template/context processing; excludes proxy, client network, CDN, video decoding and authenticated wallet/provider APIs.')
